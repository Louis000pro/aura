/* ════════════════════════════════════════════════════════════════════
   check:profils — le banc de la seule surface publique d'un profil.

     npm run check:profils

   ⚠️ IL EXERCE LE VRAI `src/lib/profilsPublics.ts`, pas une recopie. La
   décision (quelle source lire, quand retomber, quoi mémoriser) est pure :
   elle ne prend qu'une fonction de requête, donc on lui en donne une
   fausse et la chaîne entière se vérifie hors ligne, sur une app pourtant
   auth-gated.

   CE QU'IL PROTÈGE, ET CE N'EST PAS UNE HYPOTHÈSE. `profiles` est en
   `USING (true)` depuis mai, et la table porte désormais l'âge, le poids,
   la taille, le sexe, le régime, les goûts, le lieu d'entraînement,
   l'abonnement, l'identifiant de client Stripe et la marque de
   bannissement. La clé anonyme vit dans le bundle du navigateur.

   ⚠️ LES DEUX DÉFAUTS QU'IL EXISTE POUR ATTRAPER SONT SILENCIEUX.
   (1) Les DEUX listes de colonnes — celle de la vue, en SQL, et celle du
   TypeScript — décrivent la même chose à deux endroits : c'est exactement
   la seconde définition que ce produit refuse partout ailleurs, et elle
   divergerait sans que rien ne le dise.
   (2) Une lecture qui demande une colonne PRIVÉE fonctionne aujourd'hui
   (la vue n'existe pas, on retombe sur la table) et cassera le jour du
   collage. Le banc la refuse tout de suite.
   ════════════════════════════════════════════════════════════════════ */
import { readFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import {
  COLONNES_PUBLIQUES,
  TABLE_PROFILS,
  VUE_PROFILS,
  absenceDeVue,
  lireProfils,
  oublierSchemaProfils,
  vueProfilsAbsente,
} from "@/lib/profilsPublics";

let echecs = 0;
function verdict(nom: string, bon: boolean, detail = "") {
  if (!bon) echecs++;
  console.log("[" + (bon ? "OK   " : "ECHEC") + "] " + nom + (detail ? " — " + detail : ""));
}

const RACINE = path.resolve(import.meta.dirname, "..");
const lire = (p: string) => readFileSync(path.join(RACINE, p), "utf8");

/* ════════════════════════════════════════════════════════════════════
   1 · `absenceDeVue` : ce qui compte comme « la relation n'existe pas »
   ════════════════════════════════════════════════════════════════════ */

for (const [erreur, quoi] of [
  [{ message: 'relation "public.profils_publics" does not exist' }, "PostgreSQL, message brut"],
  [{ message: "Could not find the table 'public.profils_publics' in the schema cache" }, "PostgREST, cache de schéma"],
  [{ message: "Perhaps you meant the table 'public.profiles'", code: "PGRST205" }, "PostgREST, par le code"],
  [{ code: "42P01", message: "" }, "PostgreSQL, par le code"],
] as [{ message?: string; code?: string }, string][]) {
  verdict(`absence reconnue (${quoi})`, absenceDeVue(erreur) === true);
}

/* ⚠️ ET SURTOUT : CE QUI N'EN EST PAS UNE. Prendre toute erreur pour une
   absence de vue ferait retomber sur la table au premier refus de la RLS,
   c'est-à-dire exactement là où il ne faut pas. */
for (const [erreur, quoi] of [
  [null, "pas d'erreur du tout"],
  [{ message: "TypeError: Failed to fetch" }, "⚠️ le réseau : une coupure ne dit rien du schéma"],
  [{ message: "JWT expired", code: "PGRST301" }, "⚠️ session morte"],
  [{ message: "new row violates row-level security policy", code: "42501" }, "⚠️ un refus de RLS"],
  [{ message: "permission denied for view profils_publics", code: "42501" }, "⚠️ un droit manquant sur la vue"],
  [{ message: "canceling statement due to statement timeout", code: "57014" }, "⚠️ un délai dépassé"],
] as [{ message?: string; code?: string } | null, string][]) {
  verdict(`pas une absence (${quoi})`, absenceDeVue(erreur) === false);
}

/* ════════════════════════════════════════════════════════════════════
   2 · `lireProfils` : quelle source, dans quel ordre, et quoi mémoriser
   ════════════════════════════════════════════════════════════════════ */

/** Une fausse requête : elle note les sources demandées et rend ce qu'on veut. */
function fausseRequete(par: Record<string, { data: unknown; error: { message?: string; code?: string } | null }>) {
  const vues: string[] = [];
  const fn = (source: string) => {
    vues.push(source);
    const r = par[source];
    if (!r) throw new Error("source inattendue : " + source);
    return Promise.resolve(r);
  };
  return { fn, vues };
}

const OK_VUE = { data: [{ id: "a", pseudo: "nora" }], error: null };
const OK_TABLE = { data: [{ id: "a", pseudo: "depuis-la-table" }], error: null };
const ABSENTE = { data: null, error: { message: 'relation "profils_publics" does not exist' } };
const RESEAU = { data: null, error: { message: "TypeError: Failed to fetch" } };

/* ── 2a · La vue existe : un seul aller-retour, et c'est le bon ──────── */
{
  oublierSchemaProfils();
  const { fn, vues } = fausseRequete({ [VUE_PROFILS]: OK_VUE, [TABLE_PROFILS]: OK_TABLE });
  const r = await lireProfils(fn);
  verdict("la vue est lue en premier", vues[0] === VUE_PROFILS, vues.join(" → "));
  verdict("un seul aller-retour quand elle existe", vues.length === 1, vues.length + " appel(s)");
  verdict("c'est bien sa réponse qui est rendue", r.data === OK_VUE.data);
  verdict("et rien n'est mémorisé", vueProfilsAbsente() === false);
}

/* ── 2b · La vue n'existe pas : on rejoue sur la table ───────────────── */
{
  oublierSchemaProfils();
  const { fn, vues } = fausseRequete({ [VUE_PROFILS]: ABSENTE, [TABLE_PROFILS]: OK_TABLE });
  const r = await lireProfils(fn);
  verdict("absente → la table est rejouée", vues.join(" → ") === `${VUE_PROFILS} → ${TABLE_PROFILS}`, vues.join(" → "));
  verdict("c'est la réponse de la TABLE qui est rendue", r.data === OK_TABLE.data);
  verdict("l'absence est mémorisée", vueProfilsAbsente() === true);

  /* ⚠️ ET LA MÉMOIRE SERT : la deuxième lecture ne repaie pas le détour.
     Sans elle, chaque écran de la communauté paierait un aller-retour
     perdu tant que la migration n'est pas collée. */
  const deux = fausseRequete({ [TABLE_PROFILS]: OK_TABLE });
  await lireProfils(deux.fn);
  verdict("mémorisée, la vue n'est plus demandée", deux.vues.join(" → ") === TABLE_PROFILS, deux.vues.join(" → "));
}

/* ── 2c · ⚠️ LE CŒUR DU BANC : UNE COUPURE RÉSEAU NE SE MÉMORISE PAS ──
   Un sondage naïf mémoriserait « la vue n'existe pas » pour toute la
   session. Une fois la migration collée, une seule coupure au mauvais
   moment viderait donc tous les avatars de la communauté jusqu'au
   rechargement — et la lecture de repli, elle, ne rendrait que sa propre
   ligne, puisque `profiles` sera devenue propriétaire. */
{
  oublierSchemaProfils();
  const { fn, vues } = fausseRequete({ [VUE_PROFILS]: RESEAU, [TABLE_PROFILS]: OK_TABLE });
  const r = await lireProfils(fn);
  verdict("réseau coupé : aucun rejeu sur la table", vues.join(" → ") === VUE_PROFILS, vues.join(" → "));
  verdict("l'erreur est rendue telle quelle", r.error?.message === RESEAU.error.message);
  verdict("⚠️ et RIEN n'est mémorisé", vueProfilsAbsente() === false);

  /* La lecture suivante redemande donc la vue : la récupération est immédiate. */
  const deux = fausseRequete({ [VUE_PROFILS]: OK_VUE, [TABLE_PROFILS]: OK_TABLE });
  await lireProfils(deux.fn);
  verdict("la lecture suivante redemande la vue", deux.vues.join(" → ") === VUE_PROFILS, deux.vues.join(" → "));
}

/* ── 2d · Un refus de RLS n'est pas une absence non plus ─────────────── */
{
  oublierSchemaProfils();
  const RLS = { data: null, error: { message: "permission denied for view profils_publics", code: "42501" } };
  const { fn, vues } = fausseRequete({ [VUE_PROFILS]: RLS, [TABLE_PROFILS]: OK_TABLE });
  await lireProfils(fn);
  verdict("un droit manquant ne fait pas retomber sur la table", vues.length === 1, vues.join(" → "));
  verdict("et ne se mémorise pas", vueProfilsAbsente() === false);
}

/* ── 2e · La requête est REJOUÉE, elle n'est pas réutilisée ───────────
   C'est ce qui interdit de passer un constructeur Supabase déjà bâti : une
   requête déjà attendue ne se relance pas. Le banc vérifie donc que la
   fonction reçoit bien DEUX sources différentes, et jamais deux fois la
   même. */
{
  oublierSchemaProfils();
  const { fn, vues } = fausseRequete({ [VUE_PROFILS]: ABSENTE, [TABLE_PROFILS]: OK_TABLE });
  await lireProfils(fn);
  verdict("deux sources distinctes, jamais deux fois la même", new Set(vues).size === vues.length && vues.length === 2);
}
oublierSchemaProfils();

/* ════════════════════════════════════════════════════════════════════
   3 · LES DEUX LISTES DE COLONNES SONT LA MÊME
   ⚠️ C'est le contrôle le plus important du fichier. La vue est écrite en
   SQL, la liste publique en TypeScript : deux définitions de la même
   chose. Une divergence dans un sens casse un écran, dans l'autre elle
   rouvre la fuite.
   ════════════════════════════════════════════════════════════════════ */

const SQL = lire("supabase/migrations/20260915_profils_publics.sql");

const bloc = SQL.match(/create view public\.profils_publics as\s*select([\s\S]*?)from public\.profiles/i);
verdict("la migration crée bien la vue", !!bloc);
if (bloc) {
  const colonnesSql = bloc[1]
    .split(",")
    .map((c) => c.replace(/--.*$/gm, "").trim())
    .filter(Boolean);
  const attendues = [...COLONNES_PUBLIQUES];
  verdict(
    "la vue expose EXACTEMENT les colonnes publiques déclarées",
    colonnesSql.length === attendues.length && colonnesSql.every((c, i) => c === attendues[i]),
    `SQL [${colonnesSql.join(", ")}] · TS [${attendues.join(", ")}]`,
  );
}

/* ⚠️ Et aucune colonne sensible n'a pu s'y glisser. La liste est écrite en
   dur exprès : c'est le seul contrôle du fichier qui doit échouer même si
   quelqu'un met les DEUX listes d'accord sur une colonne privée. */
const INTERDITES = [
  "onboarding_age", "onboarding_height", "onboarding_weight", "onboarding_gender",
  "onboarding_meals_day", "onboarding_diet", "taste_profile",
  "training_location", "training_equipment",
  "is_premium", "subscription_tier", "subscription_status", "stripe_customer_id",
  "current_period_end", "is_banned", "email", "guide_id",
];
const glissees = INTERDITES.filter((c) => (COLONNES_PUBLIQUES as readonly string[]).includes(c));
verdict(
  "aucune colonne du corps, des goûts, du lieu, de l'abonnement ou de la modération",
  glissees.length === 0,
  glissees.length ? "FUITE : " + glissees.join(", ") : `${INTERDITES.length} colonnes vérifiées`,
);
if (bloc) {
  const dansLaVue = INTERDITES.filter((c) => new RegExp(`(^|[\\s,])${c}([\\s,]|$)`).test(bloc[1]));
  verdict("ni dans la vue elle-même", dansLaVue.length === 0, dansLaVue.join(", "));
}

/* ════════════════════════════════════════════════════════════════════
   4 · SOURCE · ce que les écrans demandent réellement
   ════════════════════════════════════════════════════════════════════ */

function fichiers(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(path.join(RACINE, dir))) {
    const rel = dir + "/" + e;
    if (statSync(path.join(RACINE, rel)).isDirectory()) fichiers(rel, out);
    else if (/\.(ts|tsx)$/.test(e)) out.push(rel);
  }
  return out;
}
const SRC = fichiers("src");

/* ⚠️ TOUTE COLONNE LUE PAR `lireProfils` DOIT ÊTRE PUBLIQUE, et c'est le
   défaut silencieux annoncé en tête : demander `onboarding_weight` par ce
   chemin marche AUJOURD'HUI (la vue n'existe pas, on retombe sur la table)
   et rendra une erreur le jour du collage. On le refuse maintenant. */
/* ⚠️ ET LE PARSEUR DOIT ÉCHOUER PLUTÔT QUE DE SAUTER CE QU'IL NE SAIT PAS
   LIRE. Sa première version ne reconnaissait que les appels refermés par
   `),` ou `);` : elle en a laissé passer un sur onze, EN SILENCE, donc elle
   ne surveillait pas la colonne de cet appel-là. On compte donc les appels
   d'un côté, les `select` compris de l'autre, et on exige l'égalité. */
let appels = 0;
let selects = 0;
const horsListe: string[] = [];
const illisibles: string[] = [];
for (const f of SRC) {
  if (f === "src/lib/profilsPublics.ts") continue;
  const src = lire(f);
  for (const m of src.matchAll(/lireProfils\(/g)) {
    appels++;
    /* Le `.select` vit toujours dans l'expression passée à l'appel, donc
       juste après : on lit une fenêtre, sans chercher à équilibrer les
       parenthèses. */
    const fenetre = src.slice(m.index, m.index + 600);
    const sel = fenetre.match(/\.select\(\s*["']([^"']+)["']/);
    if (!sel) { illisibles.push(`${f}:${src.slice(0, m.index).split("\n").length}`); continue; }
    selects++;
    for (const col of sel[1].split(",").map((c) => c.trim()).filter(Boolean)) {
      if (!(COLONNES_PUBLIQUES as readonly string[]).includes(col)) horsListe.push(`${f} → ${col}`);
    }
  }
}
verdict("des lectures publiques existent bel et bien", appels >= 11, appels + " appel(s) à lireProfils");
verdict(
  "le banc sait lire TOUS les appels",
  illisibles.length === 0,
  illisibles.length ? "non lus : " + illisibles.join(", ") : `${selects}/${appels} select(s) compris`,
);
verdict(
  "aucune de ces lectures ne demande une colonne privée",
  horsListe.length === 0,
  horsListe.length ? horsListe.join(" · ") : `${selects} select(s) balayé(s)`,
);

/* La vue ne se nomme qu'à un seul endroit : partout ailleurs on passe par
   `lireProfils`, sinon le repli ne s'appliquerait pas et l'écran se
   viderait tant que la migration n'est pas collée. */
const nommentLaVue = SRC.filter((f) => f !== "src/lib/profilsPublics.ts" && lire(f).includes("profils_publics"));
verdict(
  "la vue n'est nommée que dans son module",
  nommentLaVue.length === 0,
  nommentLaVue.join(", ") || "src/lib/profilsPublics.ts",
);

/* Et ce module LIT, il n'écrit jamais : c'est une surface de lecture. */
const mod = lire("src/lib/profilsPublics.ts");
verdict(
  "le module n'écrit rien",
  !/\.(insert|update|upsert|delete)\(/.test(mod),
  "aucun .insert( .update( .upsert( .delete(",
);
verdict(
  "il ne mémorise QUE l'absence de relation",
  /if \(!absenceDeVue\(res\.error\)\) return res;\s*\n\s*vueAbsente = true;/.test(mod),
  "mémoriser une erreur de réseau viderait la communauté pour toute la session",
);

/* ════════════════════════════════════════════════════════════════════
   5 · SOURCE · la migration ferme bien ce qu'elle dit fermer
   ⚠️ Sans cette étape, tout le reste est décoratif : la vue existerait à
   côté d'une table toujours ouverte en `USING (true)`.
   ════════════════════════════════════════════════════════════════════ */
verdict(
  "la policy ouverte est retirée",
  /drop policy if exists "Profiles lisibles par tous" on public\.profiles/i.test(SQL),
);
verdict(
  "et remplacée par une lecture propriétaire",
  /create policy[\s\S]{0,80}on public\.profiles for select\s*\n?\s*using \(auth\.uid\(\) = id\)/i.test(SQL),
);
verdict(
  "`security_invoker = false` est écrit EXPLICITEMENT",
  /set \(security_invoker = false\)/i.test(SQL),
  "en `true`, la vue subirait la RLS propriétaire et ne rendrait que sa propre ligne",
);
verdict(
  "la vue est lisible par anon et authenticated",
  /grant select on public\.profils_publics to anon, authenticated/i.test(SQL),
);
verdict(
  "le rollback est écrit",
  /ROLLBACK/.test(SQL) && /using \(true\)/i.test(SQL.slice(SQL.indexOf("ROLLBACK"))),
);

console.log(echecs ? `\n${echecs} échec(s).` : "\nTout passe.");
process.exit(echecs ? 1 : 0);
