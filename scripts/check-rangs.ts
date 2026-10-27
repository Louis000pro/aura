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
import { voix } from "@/lib/guides";
import { cleMontee, contexteMontee, jourDit } from "@/lib/motRang";
import type { CartesRang } from "@/lib/cartesRang";

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

/* ── Ce que le Guide dit quand un rang se gagne (Louis, 2026-10-26 : « quand
   tu passes d'un rang, le guide te dit toujours la même chose […] aucune
   personnalisation, aucune originalité »). Une phrase par rang, nourrie par
   la carte du rang (lib/motRang.ts), écrite dans guides.ts. ── */
{
  const NB = " ";
  const montes = RANGS.filter((r) => cleMontee(r.id)).map((r) => r.id);
  verdict(
    "le Bronze n'a pas de phrase : on l'a dès l'inscription, il ne se gagne pas",
    cleMontee("bronze") === null && cleMontee("aurore") === null && montes.join(" ") === "argent or platine diamant eternel",
    montes.join(" "),
  );

  const dire = (cartes: CartesRang | null, id: string) => voix(null, cleMontee(id)!, contexteMontee(cartes, id));

  // Le cas réel : le compte de Louis le 2026-10-26, lu dans `cartes_rang()`
  // (inscrit le 6 mai ; Argent au jour 91 avec 5 séances, Or au jour 142
  // avec 6, Platine au jour 166 avec 20 ; ni Diamant ni Éternel).
  const louis: CartesRang = {
    numero: 1,
    inscritLe: "2026-05-06",
    parRang: {
      argent: { atteintLe: "2026-08-04", seances: 5, jours: 91 },
      or: { atteintLe: "2026-09-24", seances: 6, jours: 142 },
      platine: { atteintLe: "2026-10-18", seances: 20, jours: 166 },
    },
    complet: true,
  };
  const attendu: Record<string, string> = {
    argent: "Ton premier rang arrive après cinq séances.",
    or: "Te voilà Or, avec six séances depuis ton arrivée.",
    platine: `Tu as commencé le 6${NB}mai. Depuis, tu as fait vingt séances.`,
    diamant: "Il ne reste que l’Éternel au-dessus de toi.",
    eternel: "C’est le dernier rang de Vaiiya, et tu l’as atteint.",
  };
  for (const id of montes) {
    const dit = dire(louis, id);
    verdict(`le cas réel · ${id}`, dit === attendu[id], dit);
  }

  const phrases = montes.map((id) => dire(louis, id));
  verdict(
    "cinq rangs, cinq phrases, et plus jamais « une action après l’autre »",
    new Set(phrases).size === montes.length && phrases.every((p) => !p.includes("action après")),
    `${new Set(phrases).size} phrases différentes`,
  );

  {
    const debut = { numero: 1, inscritLe: "2026-05-06", complet: true };
    const premierJour = dire({ ...debut, parRang: { argent: { atteintLe: "2026-05-06", seances: 1, jours: 1 } } }, "argent");
    verdict("l'Argent du premier jour se dit", premierJour === "Ton premier rang arrive dès ton premier jour.", premierJour);
    const quatorze = dire({ ...debut, parRang: {
      argent: { atteintLe: null, seances: 3, jours: 9 }, or: { atteintLe: null, seances: 17, jours: 30 } } }, "or");
    verdict("les séances depuis le rang d'avant se comptent", quatorze === "Tu as fait quatorze séances depuis l’Argent, et te voilà Or.", quatorze);
    // Jamais un petit chiffre qui rapetisse : une séance depuis l'Argent
    // fait dire autre chose.
    const une = dire({ ...debut, parRang: {
      argent: { atteintLe: null, seances: 5, jours: 30 }, or: { atteintLe: null, seances: 6, jours: 60 } } }, "or");
    verdict("une seule séance depuis le rang d'avant ne se dit pas", !/une séance depuis/.test(une), une);
  }

  // Rien d'inventé : sans carte, aucun chiffre.
  {
    const vides: (CartesRang | null)[] = [
      null,
      { numero: 1, inscritLe: "2026-05-06", parRang: {}, complet: false },
      { numero: 1, inscritLe: "2026-05-06", parRang: {}, complet: true },
    ];
    const fautes = montes.flatMap((id) => vides.map((c) => dire(c, id)).filter((p) => /\d|zéro/.test(p)));
    verdict("sans carte, le rang dit sa phrase sans aucun chiffre", fautes.length === 0, fautes.join(" | ") || "aucun chiffre inventé");
  }

  // Toutes les phrases possibles : la typographie, aucun accord de genre, et
  // deux lignes au plus dans la bulle. Mesuré le 2026-10-26 dans la vraie
  // scène, avec les vraies polices : 76 signes tiennent sur deux lignes à
  // 320 px ; la limite garde de la marge.
  {
    const LIMITE = 72;
    const nombres = [0, 1, 2, 3, 5, 9, 12, 17, 18, 19, 20, 21, 30, 47, 60, 99, 100, 101, 240, 999];
    const toutes = new Set<string>();
    for (const [i, id] of montes.entries()) {
      for (const s of nombres) for (const avant of nombres) for (const d of [null, "2026-05-06", "2026-09-28", "2026-10-01"]) for (const j of [1, 2, 91]) {
        if (avant > s) continue;
        const parRang: CartesRang["parRang"] = { [id]: { atteintLe: null, seances: s, jours: j } };
        if (i > 0) parRang[montes[i - 1]] = { atteintLe: null, seances: avant, jours: 1 };
        toutes.add(dire({ numero: 1, inscritLe: d, parRang, complet: true }, id));
      }
      toutes.add(dire(null, id));
    }
    const liste = [...toutes];
    const longues = liste.filter((p) => p.length > LIMITE);
    verdict(
      `toutes les phrases tiennent en ${LIMITE} signes (deux lignes de bulle)`,
      longues.length === 0,
      longues[0] ?? `${liste.length} phrases, la plus longue fait ${Math.max(...liste.map((p) => p.length))} signes`,
    );
    const typo = liste.filter((p) => /'|—| {2}|\s[,.]|\d(?![\d ]|er(?![a-z]))/.test(p));
    verdict("apostrophes courbes, aucun tiret cadratin, un chiffre collé à son mot", typo.length === 0, typo[0] ?? "propre");
    const genre = liste.filter((p) =>
      /(?<![a-zà-ÿ])(prête?|contente?|fière?|fier|motivée?|seule?|arrivé|venue?|partie?)(?![a-zà-ÿ])|\(e\)|·e/i.test(p));
    verdict("aucun accord de genre pour la personne qui lit", genre.length === 0, genre[0] ?? "aucun");
  }

  verdict(
    "le premier du mois s’écrit « 1er »",
    jourDit("2026-10-01") === `1er${NB}octobre` && jourDit("2026-05-06") === `6${NB}mai` && jourDit("6 mai") === null,
    `${jourDit("2026-10-01")} · ${jourDit("2026-05-06")}`,
  );
}

/* ── Par la source : la scène lit la carte, fige sa phrase, ignore le Bronze ── */
{
  /* Depuis le 2026-10-27, l'écouteur vit dans CelebrationRang.tsx et la
     scène dans SceneRang.tsx (chargée à la demande) : on lit les deux. */
  const scene = lire("src/components/rang/CelebrationRang.tsx") + "\n" + lire("src/components/rang/SceneRang.tsx");
  verdict("la scène ne joue jamais le Bronze", /if \(rang && cleMontee\(rang\.id\)\) setScene/.test(scene), "CelebrationRang.tsx");
  verdict(
    "la phrase se nourrit de la carte du rang",
    scene.includes("cartesDuCompte(") && scene.includes("contexteMontee(cartes, rang.id)"),
    "cartes_rang() lue à l'arrivée de la scène",
  );
  verdict(
    "la phrase ne change plus une fois la bulle à l'écran",
    (scene.match(/bulleVue\.current = true; montrer\(bulle\.current/g) ?? []).length === 2 && scene.includes("!bulleVue.current) setMot("),
    "figée quand la bulle apparaît, avec et sans mouvement réduit",
  );
  const galerie = lire("src/components/rang/RangsModal.tsx");
  verdict("les boutons admin ne rejouent pas le Bronze", /RANGS\.filter\(\(r\) => cleMontee\(r\.id\)\)\.map/.test(galerie), "RangsModal.tsx");
  const anciens = (readdirSync(path.join(RACINE, "src"), { recursive: true }) as string[])
    .filter((f) => /\.tsx?$/.test(f) && /"rang\.montee"/.test(readFileSync(path.join(RACINE, "src", f), "utf8")));
  verdict("plus aucune phrase unique pour tous les rangs", anciens.length === 0, anciens.join(", ") || "aucune");
}

/* ── Le vrai `noterRang`, sur un navigateur simulé : ce qui ne se fête pas ──
   (la montée elle-même publie dans le fil, donc elle ne se joue pas ici) */
{
  const stock = new Map<string, string>();
  const evenements: string[] = [];
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: (k: string) => stock.get(k) ?? null, setItem: (k: string, v: string) => { stock.set(k, v); } },
  });
  (globalThis as unknown as { window: unknown }).window = {
    dispatchEvent: (e: Event) => { evenements.push(e.type); return true; },
    addEventListener() {},
    removeEventListener() {},
  };
  const { noterRang, EVENEMENT_RANG_MONTE } = await import("@/lib/celebrationRang");
  const rang = (id: string) => RANGS.find((r) => r.id === id)!;
  const fete = (vu: string | null, maintenant: string) => {
    stock.clear();
    evenements.length = 0;
    if (vu !== null) stock.set("aura_rang_vu_u1", vu);
    noterRang("u1", rang(maintenant));
    return evenements.includes(EVENEMENT_RANG_MONTE);
  };
  verdict("un rang mémorisé inconnu ne fait pas passer le Bronze pour une montée", !fete("aurore", "bronze") && !fete("aurore", "or"), "rien");
  verdict("le premier passage se note sans rien fêter", !fete(null, "platine"), "rien");
  verdict("une descente ne se fête pas", !fete("or", "argent"), "rien");
}

console.log(echecs === 0 ? "\nTout passe." : `\n${echecs} échec(s).`);
process.exit(echecs === 0 ? 0 : 1);
