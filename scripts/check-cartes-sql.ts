/* ════════════════════════════════════════════════════════════════════
   check:cartes-sql · LA VITRINE CHOISIE, JOUÉE POUR DE VRAI, HORS LIGNE

     npm run check:cartes-sql

   Une base PostgreSQL en mémoire (PGlite), `profiles` avec ses droits et
   ses policies comme en production, le registre des crédits, puis
   `20261106_vitrine_choisie.sql` elle-même, deux fois : elle doit être
   rejouable.

   CE QU'IL PROTÈGE (Louis, 2026-11-06) : on choisit sa vitrine et
   personne d'autre ne peut la changer ; la colonne reste privée, elle ne
   se lit que par la fonction ; un autre membre lit le palier de la
   flamme, jamais le record exact ; et les paliers de la base sont ceux
   de l'app.

   Ce banc ne remplace pas l'essai sur la vraie base (droits Supabase,
   PostgREST) : il empêche de casser ce qu'il exerce.
   ════════════════════════════════════════════════════════════════════ */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { PLACES_VITRINE, construireCollection, toutes } from "@/lib/cartes/catalogue";
import { PALIERS_FLAMME } from "@/lib/flammesSerie";

const db = new PGlite();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const q = (s: string, p?: unknown[]) => db.query<any>(s, p);
const ex = (s: string) => db.exec(s);
let ok = 0, ko = 0;
const t = (nom: string, cond: boolean, info = "") => {
  if (cond) ok++;
  else ko++;
  console.log("[" + (cond ? "OK   " : "ECHEC") + "] " + nom + (info ? " · " + info : ""));
};

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";

await ex(`
create role anon; create role authenticated; create role service_role;
create schema auth;
grant usage on schema auth to anon, authenticated;
create function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;

-- Comme en production : la lecture colonne par colonne, l'écriture au niveau
-- de la table, bornée par les policies (20261006_profils_colonnes_privees.sql).
create table public.profiles (id uuid primary key, pseudo text, email text);
alter table public.profiles enable row level security;
create policy "lecture" on public.profiles for select using (true);
create policy "ecriture" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
grant usage on schema public to anon, authenticated;
grant select (id, pseudo) on public.profiles to authenticated;
grant update on public.profiles to anon, authenticated;

create table public.aura_mission_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  mission_id text not null,
  period_type text not null,
  period_key text not null,
  points numeric not null default 5,
  unique (user_id, mission_id, period_key)
);
alter table public.aura_mission_credits enable row level security;
create policy "le sien" on public.aura_mission_credits for select using (auth.uid() = user_id);
`);

const migration = readFileSync(new URL("../supabase/migrations/20261106_vitrine_choisie.sql", import.meta.url), "utf8");
await ex(migration);
await ex(migration);
t("la migration est rejouable", true);

await ex(`insert into public.profiles (id, pseudo) values ('${A}', 'Louis'), ('${B}', 'Marc');`);

/** Joue une requête comme le navigateur d'un compte, puis rend la main. */
async function comme<T>(role: "authenticated" | "anon", uid: string, f: () => Promise<T>): Promise<T> {
  await ex(`select set_config('test.uid', '${uid}', false); set role ${role};`);
  try {
    return await f();
  } finally {
    await ex(`reset role; select set_config('test.uid', '', false);`);
  }
}
const refuse = async (f: () => Promise<unknown>) => {
  try {
    await f();
    return false;
  } catch {
    return true;
  }
};
const lignes = (u: string) => q(`select v_cartes, v_flamme from public.vitrine_profil($1::uuid)`, [u]);
const ecrire = (u: string, valeur: string) => q(`update public.profiles set vitrine_cartes = ${valeur} where id = $1::uuid`, [u]);
const enBase = async (u: string) => (await q(`select vitrine_cartes from public.profiles where id = $1::uuid`, [u])).rows[0].vitrine_cartes as string[] | null;

/* ── Le choix ── */
t("sans choix : NULL, Vaiiya compose", (await enBase(A)) === null);
await comme("authenticated", A, () => ecrire(A, `array['rang-or', 'relais-sillage', 'flamme-feu']`));
t("on écrit sa propre vitrine, dans son ordre", (await enBase(A))?.join() === "rang-or,relais-sillage,flamme-feu", String(await enBase(A)));

const r = await comme("authenticated", B, () => ecrire(A, `array['rang-eternel']`));
t("personne ne change la vitrine d'un autre", (r.affectedRows ?? 0) === 0 && (await enBase(A))?.length === 3, String(await enBase(A)));
t("sans compte non plus", (await refuse(() => comme("anon", "", () => ecrire(A, `null`)))) && (await enBase(A))?.length === 3);

/* ── La forme ── */
for (const [nom, valeur] of [
  ["quatre cartes", `array['a', 'b', 'c', 'd']`],
  ["une liste vide", `array[]::text[]`],
  ["une valeur NULL dans la liste", `array['rang-or', null]`],
  ["des majuscules", `array['RANG-OR']`],
  ["un identifiant de plus de 40 signes", `array['${"a".repeat(41)}']`],
  ["autre chose qu'un identifiant", `array['<script>']`],
] as const) {
  t(`la forme refuse ${nom}`, await refuse(() => comme("authenticated", A, () => ecrire(A, valeur))));
}
t("une carte, puis deux, passent", !(await refuse(() => comme("authenticated", A, () => ecrire(A, `array['rang-or']`)))) && !(await refuse(() => comme("authenticated", A, () => ecrire(A, `array['rang-or', 'flamme-feu']`)))));
t("revenir à NULL passe", !(await refuse(() => comme("authenticated", A, () => ecrire(A, `null`)))) && (await enBase(A)) === null);
await comme("authenticated", A, () => ecrire(A, `array['rang-or', 'relais-sillage']`));

/* ── La lecture ── */
t("la colonne reste privée, même pour son propriétaire", await refuse(() => comme("authenticated", A, () => q(`select vitrine_cartes from public.profiles where id = '${A}'`))));
t("le pseudo reste public", !(await refuse(() => comme("authenticated", B, () => q(`select pseudo from public.profiles where id = '${A}'`)))));
const vu = await comme("authenticated", B, () => lignes(A));
t("un autre membre lit le choix par la fonction", vu.rows[0]?.v_cartes?.join() === "rang-or,relais-sillage", JSON.stringify(vu.rows[0]));
t("sans session : rien", (await comme("authenticated", "", () => lignes(A))).rows.length === 0);
t("un visiteur sans compte ne l'appelle pas", await refuse(() => comme("anon", "", () => lignes(A))));

/* ── La flamme ── */
const jours = async (u: string, debut: string, n: number, mission = "connexion") => {
  await q(
    `insert into public.aura_mission_credits (user_id, mission_id, period_type, period_key)
     select $1::uuid, $2, 'day', (($3::date) + i)::text from generate_series(0, $4::int - 1) as i
     on conflict do nothing`,
    [u, mission, debut, n],
  );
};
const flamme = async (u: string) => (await comme("authenticated", u, () => lignes(u))).rows[0].v_flamme as number;
const vider = (u: string) => q(`delete from public.aura_mission_credits where user_id = $1::uuid`, [u]);

t("aucun jour : aucune flamme", (await flamme(B)) === 0);
await jours(B, "2026-09-01", 1);
t("un jour : la Lueur", (await flamme(B)) === 1);
await vider(B);
await jours(B, "2026-09-01", 2);
t("deux jours : encore la Lueur", (await flamme(B)) === 1);
await vider(B);
await jours(B, "2026-09-01", 5);
t("cinq jours d'une série cassée : le palier 3, pas le chiffre 5", (await flamme(B)) === 3, String(await flamme(B)));
await vider(B);
await jours(B, "2026-09-01", 12);
await jours(B, "2026-10-01", 45);
t("la plus longue suite compte, pas la dernière", (await flamme(B)) === 30, String(await flamme(B)));
await vider(B);
await jours(B, "2026-01-01", 120);
t("cent jours : le Feu sacré", (await flamme(B)) === 100);
await vider(B);

await jours(B, "2026-09-01", 2, "connexion");
await jours(B, "2026-09-03", 2, "seance");
await jours(B, "2026-09-05", 3, "repas");
t("une connexion, une séance ou un repas : la même suite", (await flamme(B)) === 7, String(await flamme(B)));
await vider(B);
await jours(B, "2026-09-01", 3, "connexion");
await jours(B, "2026-09-01", 3, "seance");
t("deux crédits le même jour comptent un seul jour", (await flamme(B)) === 3, String(await flamme(B)));
await vider(B);
await jours(B, "2026-09-01", 40, "mouvement_du_jour");
t("retourner la carte du jour ne compte pas", (await flamme(B)) === 0);
await vider(B);
await q(`insert into public.aura_mission_credits (user_id, mission_id, period_type, period_key) values ($1::uuid, 'relais_gagne', 'relais', 'x')`, [B]);
t("un crédit qui n'est pas un jour ne fait pas planter le calcul", (await flamme(B)) === 0);
await vider(B);

await jours(A, "2026-09-01", 9);
const palier = (await comme("authenticated", B, () => lignes(A))).rows[0].v_flamme;
t("chez un autre, le palier et rien de plus", palier === 7, String(palier));
t("la flamme de l'un n'est pas celle de l'autre", (await flamme(B)) === 0);

/* ── Les paliers de la base sont ceux de l'app ── */
const paliers = /unnest\(ARRAY\[([\d, ]+)\]\)/.exec(migration)?.[1].split(",").map((x) => Number(x.trim())) ?? [];
t(
  "les paliers de la base sont ceux de l'app",
  paliers.join() === PALIERS_FLAMME.map((p) => p.des).join(),
  `${paliers.join()} / ${PALIERS_FLAMME.map((p) => p.des).join()}`,
);
t("la base garde autant de places que l'app", new RegExp(`BETWEEN 1 AND ${PLACES_VITRINE}`).test(migration));

const cartes = toutes(construireCollection({ pseudo: "Louis", rangId: "or", serie: 1, slugs: new Set(), guide: null })).map((c) => c.id);
let refusees = 0;
for (const id of cartes) {
  if (await refuse(() => comme("authenticated", A, () => ecrire(A, `array['${id}']`)))) refusees++;
}
t(`les ${cartes.length} cartes du catalogue passent la forme`, cartes.length === 22 && refusees === 0, `${refusees} refusée(s)`);

console.log(`\n${ok} contrôles passés, ${ko} en échec.`);
process.exit(ko ? 1 : 0);
