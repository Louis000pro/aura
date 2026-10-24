/* ════════════════════════════════════════════════════════════════════
   check:passage-sql · LES JOKERS ET LES CARTES DE RANG, JOUÉS POUR DE
   VRAI, HORS LIGNE

     npm run check:passage-sql

   Une base PostgreSQL en mémoire (PGlite), le schéma minimal dont la
   migration dépend (le registre des crédits, les profils, les séances,
   les repas, `jours_actifs_aura` recopiée de la base), puis
   `20261024_passage_de_rang.sql` elle-même, deux fois : elle doit être
   rejouable.

   CE QU'IL PROTÈGE (Louis, 2026-10-24) : un jour sans rien d'une série en
   vie prend un joker tant que le mois en a, au rang qu'on avait ce jour-là
   (1 à Argent, 2 à Or, 3 dès Platine) ; le jour couvert garde la série sans
   compter ; aujourd'hui n'est jamais couvert ; rien avant le 24 octobre ;
   une série morte ne consomme rien ; la connexion double le lendemain d'un
   jour couvert ; les cartes disent la date du seuil, les séances et les
   jours, et rien à quelqu'un d'autre.

   Ce banc ne remplace pas l'essai sur la vraie base (droits Supabase) : il
   empêche de casser ce qu'il exerce.
   ════════════════════════════════════════════════════════════════════ */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { JOKERS_PAR_MOIS, RANGS } from "@/lib/aura";

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

await ex(`
create role anon; create role authenticated; create role service_role;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create table public.profiles (id uuid primary key, is_premium boolean default false, is_admin boolean default false,
  created_at timestamptz default now(), member_number integer);
create table public.workout_sessions (id uuid primary key default gen_random_uuid(), user_id uuid, duration_minutes int, started_at timestamptz);
create table public.nutrition_logs (id uuid primary key default gen_random_uuid(), user_id uuid, meal_type text, date date);
create table public.aura_mission_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id text not null,
  period_type text not null check (period_type = any (array['day', 'week'])),
  period_key text not null,
  points numeric not null check (points > 0),
  earned_at timestamptz not null default now(),
  unique (user_id, mission_id, period_key)
);
-- Recopiée de la base (2026-10-24), que la migration ne touche pas.
create function public.jours_actifs_aura(p_user uuid, p_debut date, p_fin date) returns date[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct credits.period_key::date), array[]::date[])
  from public.aura_mission_credits as credits
  where credits.user_id = p_user and credits.mission_id in ('seance', 'repas') and credits.period_type = 'day'
    and credits.period_key >= p_debut::text and credits.period_key <= p_fin::text;
$$;
`);

const mig = readFileSync(new URL("../supabase/migrations/20261024_passage_de_rang.sql", import.meta.url), "utf8");
await ex(mig);
await ex(mig);
t("la migration est rejouable", true);

/* ── Les outils du banc ── */
let n = 0;
const nouveau = async (exp: number, inscrit = "2026-07-01") => {
  n++;
  const id = `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
  await ex(`insert into auth.users values ('${id}'); insert into public.profiles (id, created_at, member_number) values ('${id}', '${inscrit} 10:00:00+02', ${40 + n});`);
  // L'EXP de départ, gagnée bien avant les jours du banc.
  if (exp > 10) await q(`insert into public.aura_mission_credits (user_id, mission_id, period_type, period_key, points, earned_at) values ($1, 'semaine_active', 'week', 'socle-${n}', $2, '2026-07-02 12:00:00+02')`, [id, exp - 10]);
  return id;
};
/** Un jour de la série (une connexion), crédité ce jour-là. Un point
 *  seulement : le banc compte des jours, les seuils se posent à part. */
const venir = async (u: string, jour: string, points = 1) =>
  q(`insert into public.aura_mission_credits (user_id, mission_id, period_type, period_key, points, earned_at) values ($1, 'connexion', 'day', $2, $3, ($2 || ' 09:00:00+01')::timestamptz) on conflict do nothing`, [u, jour, points]);
const venirDu = async (u: string, debut: string, fin: string) => {
  for (let d = new Date(`${debut}T12:00:00Z`); d <= new Date(`${fin}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    await venir(u, d.toISOString().slice(0, 10));
  }
};
const etat = async (u: string, jour: string) => (await q(
  `select serie, couverts::text[] as couverts, par_mois, utilises from public.serie_jokers_aura($1::uuid, $2::date)`, [u, jour],
)).rows[0] as { serie: number; couverts: string[]; par_mois: number; utilises: number };
const voir = (e: { serie: number; couverts: string[]; par_mois: number; utilises: number }) =>
  `série ${e.serie}, couverts [${e.couverts.join(", ")}], ${e.utilises}/${e.par_mois}`;

/* ── La règle des jokers est la même des deux côtés ── */
{
  const bons: string[] = [];
  for (const r of RANGS) {
    const base = (await q(`select public.jokers_par_mois_aura($1) as j`, [r.min])).rows[0].j;
    const juste = (await q(`select public.jokers_par_mois_aura($1) as j`, [r.min === 0 ? 0 : r.min - 1])).rows[0].j;
    if (base !== JOKERS_PAR_MOIS[r.id]) bons.push(`${r.id} : base ${base}, app ${JOKERS_PAR_MOIS[r.id]}`);
    const avant = RANGS[Math.max(0, RANGS.indexOf(r) - 1)];
    if (r.min > 0 && juste !== JOKERS_PAR_MOIS[avant.id]) bons.push(`${r.id} - 1 EXP : ${juste}`);
  }
  t("la base et l'app donnent les mêmes jokers à chaque rang (1, 2, puis 3)", bons.length === 0, bons.join(" ; ") || "six rangs");
}

/* ── Argent : un joker par mois ── */
{
  const u = await nouveau(150);
  await venirDu(u, "2026-11-01", "2026-11-05");
  await venirDu(u, "2026-11-07", "2026-11-09");
  const e = await etat(u, "2026-11-10");
  t("Argent : le 6 novembre, sans rien, prend le joker du mois", e.couverts.join() === "2026-11-06", voir(e));
  t("le jour couvert garde la série sans compter : 8 jours, pas 9", e.serie === 8, voir(e));
  t("le mois a donné son joker : 1 utilisé sur 1", e.par_mois === 1 && e.utilises === 1, voir(e));

  const v = await nouveau(150);
  await venirDu(v, "2026-11-01", "2026-11-05");
  await venir(v, "2026-11-07");
  await venir(v, "2026-11-09");
  const f = await etat(v, "2026-11-10");
  t("Argent : un second jour sans, le même mois, casse la série", f.couverts.join() === "2026-11-06" && f.serie === 1, voir(f));
}

/* ── Bronze : aucun joker ── */
{
  const u = await nouveau(40);
  await venirDu(u, "2026-11-01", "2026-11-05");
  await venirDu(u, "2026-11-07", "2026-11-09");
  const e = await etat(u, "2026-11-10");
  t("Bronze : pas de joker, la série repart après le jour sans", e.couverts.length === 0 && e.serie === 3 && e.par_mois === 0, voir(e));
}

/* ── Le 1er du mois recharge ── */
{
  const u = await nouveau(150);
  await venirDu(u, "2026-10-26", "2026-10-29");
  await venirDu(u, "2026-10-31", "2026-11-01");
  await venirDu(u, "2026-11-03", "2026-11-04");
  const e = await etat(u, "2026-11-05");
  t("un joker en octobre, un autre en novembre : la série tient", e.couverts.join() === "2026-10-30,2026-11-02" && e.serie === 8, voir(e));
  t("le compte du mois ne porte que novembre", e.utilises === 1, voir(e));
}

/* ── Le rang qu'on avait CE jour-là ── */
{
  const u = await nouveau(300);
  await venirDu(u, "2026-11-01", "2026-11-04");
  await venirDu(u, "2026-11-06", "2026-11-09");
  // L'Or arrive le 10 (300 + 8 + 60 = 368) : deux jokers par mois à partir de là.
  await q(`insert into public.aura_mission_credits (user_id, mission_id, period_type, period_key, points, earned_at) values ($1, 'seance', 'day', '2026-11-10', 60, '2026-11-10 18:00:00+01')`, [u]);
  await venirDu(u, "2026-11-10", "2026-11-11");
  await venirDu(u, "2026-11-13", "2026-11-14");
  const e = await etat(u, "2026-11-15");
  t("Argent le 5, Or le 12 : le second joker du mois arrive avec l'Or", e.couverts.join() === "2026-11-05,2026-11-12", voir(e));
  t("Or : 2 jokers par mois, 2 utilisés", e.par_mois === 2 && e.utilises === 2, voir(e));

  const v = await nouveau(150);
  await venirDu(v, "2026-11-01", "2026-11-04");
  await venirDu(v, "2026-11-06", "2026-11-11");
  await venirDu(v, "2026-11-13", "2026-11-14");
  const f = await etat(v, "2026-11-15");
  t("resté Argent, le second jour sans du mois casse la série", f.couverts.join() === "2026-11-05" && f.serie === 2, voir(f));
}

/* ── Platine : trois jours de suite ── */
{
  const u = await nouveau(900);
  await venirDu(u, "2026-11-01", "2026-11-04");
  await venirDu(u, "2026-11-08", "2026-11-09");
  const e = await etat(u, "2026-11-10");
  t("Platine : trois jours sans de suite, trois jokers, la série tient", e.couverts.join() === "2026-11-05,2026-11-06,2026-11-07" && e.serie === 6, voir(e));

  const v = await nouveau(900);
  await venirDu(v, "2026-11-01", "2026-11-04");
  await venirDu(v, "2026-11-09", "2026-11-09");
  const f = await etat(v, "2026-11-10");
  t("un quatrième jour sans de suite casse la série", f.couverts.length === 3 && f.serie === 1, voir(f));
}

/* ── Une série morte ne consomme rien ── */
{
  const u = await nouveau(150);
  await venir(u, "2026-11-01");
  await venir(u, "2026-11-10");
  const e = await etat(u, "2026-11-11");
  t("après la coupure, les jours sans ne prennent plus de joker", e.couverts.join() === "2026-11-02" && e.utilises === 1 && e.serie === 1, voir(e));
}

/* ── Aujourd'hui n'est jamais couvert ; hier peut l'être ── */
{
  const u = await nouveau(150);
  await venirDu(u, "2026-11-01", "2026-11-04");
  const e = await etat(u, "2026-11-05");
  t("aujourd'hui, pas encore venu : la série tient jusqu'à minuit, sans joker", e.couverts.length === 0 && e.serie === 4, voir(e));
  const f = await etat(u, "2026-11-06");
  t("le lendemain matin, hier est couvert et la série continue", f.couverts.join() === "2026-11-05" && f.serie === 4, voir(f));
}

/* ── Rien avant le 24 octobre ── */
{
  const u = await nouveau(150);
  await venirDu(u, "2026-10-18", "2026-10-20");
  await venirDu(u, "2026-10-22", "2026-10-23");
  const e = await etat(u, "2026-10-24");
  t("un jour sans d'avant la mise en ligne reste un jour sans", e.couverts.length === 0 && e.serie === 2, voir(e));
}

/* ── La connexion double le lendemain d'un jour couvert ── */
{
  const u = await nouveau(150);
  await venirDu(u, "2026-11-01", "2026-11-04");
  const apresJoker = Number((await q(`select public.exp_connexion_aura($1::uuid, '2026-11-06'::date) as x`, [u])).rows[0].x);
  t("le lendemain d'un joker, la connexion double (20)", apresJoker === 20, String(apresJoker));
  const b = await nouveau(40);
  await venirDu(b, "2026-11-01", "2026-11-04");
  const sansJoker = Number((await q(`select public.exp_connexion_aura($1::uuid, '2026-11-06'::date) as x`, [b])).rows[0].x);
  t("sans joker, un jour sauté remet la connexion à 10", sansJoker === 10, String(sansJoker));
  const suite = Number((await q(`select public.exp_connexion_aura($1::uuid, '2026-11-05'::date) as x`, [b])).rows[0].x);
  t("venu la veille, la connexion double toujours", suite === 20, String(suite));
}

/* ── L'état des missions porte les jokers ── */
const jour: string = (await q(`select (now() at time zone 'Europe/Paris')::date::text as j`)).rows[0].j;
{
  const u = await nouveau(150);
  await venir(u, jour);
  await ex(`select set_config('test.uid', '${u}', false)`);
  const e = (await q(`select public.etat_missions_aura($1::uuid) as e`, [u])).rows[0].e;
  t("l'état reste en version 2", e?.version === 2, String(e?.version));
  t("l'état porte les jokers du mois", e?.jokers?.parMois === 1 && typeof e?.jokers?.restants === "number" && Array.isArray(e?.jokers?.couverts), JSON.stringify(e?.jokers));
  const serie = (await q(`select public.serie_aura($1::uuid) as s`, [u])).rows[0].s;
  t("serie_aura et l'état disent la même série", serie === e?.serie && e?.serie === 1, `${serie} / ${e?.serie}`);
  const autre = await nouveau(150);
  const vole = (await q(`select public.etat_missions_aura($1::uuid) as e`, [autre])).rows[0].e;
  t("l'état de quelqu'un d'autre ne se lit pas", vole === null, String(vole));
}

/* ── Les cartes ── */
{
  const u = await nouveau(10, "2026-08-01");
  await q(`insert into public.aura_mission_credits (user_id, mission_id, period_type, period_key, points, earned_at) values
    ($1, 'connexion', 'day', '2026-08-01', 10, '2026-08-01 10:05:00+02'),
    ($1, 'seance', 'day', '2026-08-02', 35, '2026-08-02 19:00:00+02'),
    ($1, 'seance', 'day', '2026-08-03', 60, '2026-08-03 19:00:00+02'),
    ($1, 'seance', 'day', '2026-08-20', 300, '2026-08-20 20:00:00+02')`, [u]);
  await q(`insert into public.workout_sessions (user_id, duration_minutes, started_at) values
    ($1, 20, '2026-08-02 18:30:00+02'), ($1, 25, '2026-08-03 18:20:00+02'), ($1, 30, '2026-08-20 19:20:00+02'), ($1, 30, '2026-09-01 19:00:00+02')`, [u]);
  await ex(`select set_config('test.uid', '${u}', false)`);
  const c = (await q(`select public.cartes_rang() as c`)).rows[0].c;
  const argent = c?.cartes?.find((x: { rang: string }) => x.rang === "argent");
  const or = c?.cartes?.find((x: { rang: string }) => x.rang === "or");
  t("le numéro de membre et l'inscription", c?.numero === 40 + n && c?.inscritLe === "2026-08-01", `${c?.numero} · ${c?.inscritLe}`);
  t("Argent : atteint le 3 août (10 + 10 + 35 + 60 = 115)", argent?.atteintLe === "2026-08-03", JSON.stringify(argent));
  t("Argent : deux séances commencées avant le seuil, en trois jours", argent?.seances === 2 && argent?.jours === 3, JSON.stringify(argent));
  t("Or : atteint le 20 août, trois séances, vingt jours", or?.atteintLe === "2026-08-20" && or?.seances === 3 && or?.jours === 20, JSON.stringify(or));
  t("pas de carte pour un rang qu'on n'a pas", (c?.cartes ?? []).length === 2, (c?.cartes ?? []).map((x: { rang: string }) => x.rang).join(", "));
  await ex(`select set_config('test.uid', '', false)`);
  const sans = (await q(`select public.cartes_rang() as c`)).rows[0].c;
  t("sans session, aucune carte", sans === null, String(sans));
}

console.log(ko === 0 ? `\nTout passe (${ok} contrôles).` : `\n${ko} échec(s) sur ${ok + ko}.`);
process.exit(ko === 0 ? 0 : 1);
