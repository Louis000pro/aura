/* ════════════════════════════════════════════════════════════════════
   check:parcours-sql · LA MIGRATION DES PROGRAMMES, JOUÉE POUR DE VRAI,
   HORS LIGNE

     npm run check:parcours-sql

   Une base PostgreSQL en mémoire (PGlite), le schéma minimal dont la
   migration dépend (les comptes, les profils, les badges, et les colonnes
   du planning qu'elle lit), puis `20261101_programmes_parcours.sql`
   elle-même, deux fois : elle doit être rejouable.

   CE QU'IL PROTÈGE (GO de Louis, 2026-11-01) : un seul programme à la
   fois ; un créneau de séance ne se referme qu'une fois, et seulement dans
   le programme EN COURS de la même personne ; les tests ne se réécrivent
   pas ; le test final n'arrive qu'après toutes les séances, termine le
   programme et pose son badge ; arrêter garde les séances faites ; la
   suppression d'un compte ne bute sur rien.

   Ce banc ne remplace pas l'essai sur la vraie base (droits Supabase,
   appels réellement simultanés : PGlite n'a qu'une connexion) : il
   empêche de casser ce qu'il exerce.
   ════════════════════════════════════════════════════════════════════ */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

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
/** Le message d'erreur d'une requête, ou `null` si elle passe. */
const erreur = async (s: string, p?: unknown[]): Promise<string | null> => {
  try { await q(s, p); return null; } catch (e) { return (e as Error).message; }
};

await ex(`
create role anon; create role authenticated; create role service_role;
create schema auth;
grant usage on schema auth to authenticated, anon;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade);
create table public.profile_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_slug text not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, badge_slug)
);
-- Les colonnes du planning que la migration lit, recopiées de la base (2026-11-01).
create table public.intentions_entrainement (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date,
  title text not null default '',
  exercise_list jsonb not null default '[]'::jsonb,
  statut text not null default 'prevue' check (statut in ('prevue', 'faite', 'passee')),
  nature text not null default 'seance' check (nature in ('seance', 'repos')),
  origine text not null default 'systeme',
  consommee_le timestamptz,
  etape_consommee_id uuid,
  lancement_id uuid,
  constraint intentions_consommee_check check ((statut = 'prevue') = (consommee_le is null)),
  constraint uniq_intention_lancement unique (user_id, lancement_id)
);
`);

const mig = readFileSync(new URL("../supabase/migrations/20261101_programmes_parcours.sql", import.meta.url), "utf8");
await ex(mig);
await ex(mig);
t("la migration est rejouable", true);

const U = "11111111-1111-1111-1111-111111111111";
const V = "22222222-2222-2222-2222-222222222222";
await ex(`insert into auth.users values ('${U}'), ('${V}'); insert into public.profiles values ('${U}'), ('${V}');`);
const sessionDe = (u: string | null) => ex(`select set_config('test.uid', '${u ?? ""}', false)`);
const commencer = (programme: string, jours: number[], debut = "current_date", creneaux = 6) =>
  q(`select public.commencer_parcours($1, $2::smallint[], ${debut}, $3::smallint) as id`, [programme, jours, creneaux]);

/* ── Commencer ── */
await sessionDe(null);
t("commencer sans session est refusé", (await erreur(`select public.commencer_parcours('premiere-traction', array[1,3,5]::smallint[], current_date, 6::smallint)`))?.includes("sans_session") ?? false);
await sessionDe(U);
t("un nom de programme hors vocabulaire est refusé", (await erreur(`select public.commencer_parcours('Première traction', array[1,3,5]::smallint[], current_date, 6::smallint)`))?.includes("programme_invalide") ?? false);
t("deux fois le même jour est refusé", (await erreur(`select public.commencer_parcours('premiere-traction', array[1,1,5]::smallint[], current_date, 6::smallint)`))?.includes("jours_invalides") ?? false);
t("un jour hors de la semaine est refusé", (await erreur(`select public.commencer_parcours('premiere-traction', array[0,3,5]::smallint[], current_date, 6::smallint)`))?.includes("jours_invalides") ?? false);
t("un départ dans un mois est refusé", (await erreur(`select public.commencer_parcours('premiere-traction', array[1,3,5]::smallint[], current_date + 30, 6::smallint)`))?.includes("debut_invalide") ?? false);
t("deux créneaux ne font pas un programme", (await erreur(`select public.commencer_parcours('premiere-traction', array[1,3,5]::smallint[], current_date, 2::smallint)`))?.includes("creneaux_invalides") ?? false);

const P1 = (await commencer("premiere-traction", [5, 1, 3])).rows[0].id as string;
t("commencer rend l'identifiant du programme", /^[0-9a-f-]{36}$/.test(P1));
const ligne = (await q(`select * from public.parcours where id = $1`, [P1])).rows[0];
t("les jours sont rangés", JSON.stringify(ligne.jours) === "[1,3,5]", JSON.stringify(ligne.jours));
t("le programme naît en cours, au premier créneau", ligne.statut === "en_cours" && ligne.rang_debut === 1 && ligne.fini_le === null);
t("un second programme en cours est refusé", (await erreur(`select public.commencer_parcours('cent-pompes', array[2,4,6]::smallint[], current_date, 6::smallint)`))?.includes("deja_en_cours") ?? false);
await sessionDe(V);
const PV = (await commencer("cent-pompes", [2, 4, 6])).rows[0].id as string;
t("quelqu'un d'autre peut avoir son propre programme", /^[0-9a-f-]{36}$/.test(PV));

/* ── Lire : chacun ne voit que les siens ── */
await ex(`set role authenticated`);
await sessionDe(U);
const vusU = (await q(`select id from public.parcours`)).rows.map((r) => r.id);
await sessionDe(V);
const vusV = (await q(`select id from public.parcours`)).rows.map((r) => r.id);
t("chacun ne lit que son programme", vusU.length === 1 && vusU[0] === P1 && vusV.length === 1 && vusV[0] === PV);
t("la table ne s'écrit pas depuis le navigateur", (await erreur(`update public.parcours set statut = 'termine'`)) !== null);
await ex(`reset role`);

/* ── Les faits ── */
const fait = (u: string, parcours: string | null, rang: number | null, extra = "") =>
  `insert into public.intentions_entrainement (user_id, date, title, statut, nature, consommee_le, lancement_id, parcours_id, parcours_rang ${extra ? ", " + extra.split("=")[0] : ""})
   values ('${u}', current_date, 'Séance', 'faite', 'seance', now(), gen_random_uuid(), ${parcours ? `'${parcours}'` : "null"}, ${rang ?? "null"} ${extra ? ", " + extra.split("=")[1] : ""})`;
t("le premier créneau (le test) ne s'écrit pas comme une séance", (await erreur(fait(U, P1, 1)))?.includes("creneau_hors_parcours") ?? false);
t("le dernier créneau (le test final) non plus", (await erreur(fait(U, P1, 6)))?.includes("creneau_hors_parcours") ?? false);
t("un créneau de séance s'écrit", (await erreur(fait(U, P1, 2))) === null);
t("le même créneau ne s'écrit pas deux fois", (await erreur(fait(U, P1, 2)))?.includes("uniq_parcours_creneau") ?? false);
t("le programme de quelqu'un d'autre est refusé", (await erreur(fait(U, PV, 3)))?.includes("parcours_inconnu") ?? false);
t("une séance prévue n'est pas un fait de programme", (await erreur(
  `insert into public.intentions_entrainement (user_id, date, statut, nature, parcours_id, parcours_rang) values ('${U}', current_date, 'prevue', 'seance', '${P1}', 3)`,
))?.includes("fait_parcours_invalide") ?? false);
t("un fait de programme ne porte aucune étape du cycle", (await erreur(fait(U, P1, 3, `etape_consommee_id=gen_random_uuid()`)))?.includes("fait_parcours_invalide") ?? false);
t("une intention sans programme garde un rang vide", (await q(
  `insert into public.intentions_entrainement (user_id, date, statut, nature, parcours_rang) values ('${U}', current_date, 'prevue', 'seance', 4) returning parcours_rang`,
)).rows[0].parcours_rang === null);

/* ── Les tests ── */
await sessionDe(U);
const noter = (moment: string, valeur: number, parcours = P1) =>
  q(`select public.noter_test_parcours($1::uuid, $2, $3::numeric) as r`, [parcours, moment, valeur]);
t("le test final avant le test de départ est refusé", (await erreur(`select public.noter_test_parcours('${P1}'::uuid, 'fin', 3)`))?.includes("test_depart_manquant") ?? false);
t("le test de départ se note", (await noter("depart", 0)).rows[0].r === "note");
t("le test de départ ne se réécrit pas", (await noter("depart", 4)).rows[0].r === "deja");
t("zéro reste zéro", Number((await q(`select test_depart from public.parcours where id = $1`, [P1])).rows[0].test_depart) === 0);
t("un moment inconnu est refusé", (await erreur(`select public.noter_test_parcours('${P1}'::uuid, 'milieu', 3)`))?.includes("moment_invalide") ?? false);
t("une valeur négative est refusée", (await erreur(`select public.noter_test_parcours('${P1}'::uuid, 'fin', -1)`))?.includes("valeur_invalide") ?? false);
t("le test final attend toutes les séances", (await erreur(`select public.noter_test_parcours('${P1}'::uuid, 'fin', 2)`))?.includes("seances_manquantes") ?? false);
await sessionDe(V);
t("quelqu'un d'autre ne note pas mon test", (await erreur(`select public.noter_test_parcours('${P1}'::uuid, 'fin', 2)`))?.includes("parcours_inconnu") ?? false);
await sessionDe(U);
for (const r of [3, 4, 5]) await q(fait(U, P1, r));
t("après les séances, le test final termine le programme", (await noter("fin", 2)).rows[0].r === "termine");
const fini = (await q(`select statut, fini_le, test_fin from public.parcours where id = $1`, [P1])).rows[0];
t("le programme est terminé, et daté", fini.statut === "termine" && fini.fini_le !== null && Number(fini.test_fin) === 2);
t("son badge est posé", (await q(`select 1 from public.profile_badges where user_id = $1 and badge_slug = 'programme-premiere-traction'`, [U])).rows.length === 1);
t("le test final ne se réécrit pas", (await noter("fin", 3)).rows[0].r === "deja");
t("un programme terminé ne prend plus de séance", (await erreur(fait(U, P1, 5)))?.includes("parcours_clos") ?? false);

/* ── Recommencer, changer ses jours, arrêter ── */
const P2 = (await commencer("premiere-traction", [2, 4, 6], "current_date", 18)).rows[0].id as string;
t("après un programme terminé, on peut en commencer un autre", /^[0-9a-f-]{36}$/.test(P2));
t("refaire un programme ne pose pas un second badge", (await q(`select count(*)::int as n from public.profile_badges where user_id = $1`, [U])).rows[0].n === 1);
await q(`select public.changer_jours_parcours($1::uuid, array[1,2,3]::smallint[], current_date, 4::smallint)`, [P2]);
const change = (await q(`select jours, rang_debut from public.parcours where id = $1`, [P2])).rows[0];
t("changer ses jours repose la suite à partir d'un créneau", JSON.stringify(change.jours) === "[1,2,3]" && change.rang_debut === 4);
t("un créneau de départ hors du programme est refusé", (await erreur(`select public.changer_jours_parcours('${P2}'::uuid, array[1,2,3]::smallint[], current_date, 30::smallint)`))?.includes("rang_invalide") ?? false);
await q(fait(U, P2, 2));
t("arrêter rend vrai", (await q(`select public.arreter_parcours($1::uuid) as r`, [P2])).rows[0].r === true);
t("arrêter deux fois rend faux", (await q(`select public.arreter_parcours($1::uuid) as r`, [P2])).rows[0].r === false);
t("les séances faites restent", (await q(`select count(*)::int as n from public.intentions_entrainement where parcours_id = $1`, [P2])).rows[0].n === 1);
t("un programme arrêté ne prend plus de séance", (await erreur(fait(U, P2, 3)))?.includes("parcours_clos") ?? false);
t("ni de test", (await erreur(`select public.noter_test_parcours('${P2}'::uuid, 'depart', 1)`))?.includes("parcours_clos") ?? false);
t("changer les jours d'un programme arrêté est refusé", (await erreur(`select public.changer_jours_parcours('${P2}'::uuid, array[1,2,3]::smallint[], current_date, 4::smallint)`))?.includes("parcours_clos") ?? false);

/* ── Suppressions ── */
await ex(`delete from public.parcours where id = '${P2}'`);
const orphelin = (await q(`select parcours_id, parcours_rang from public.intentions_entrainement where title = 'Séance' and user_id = $1 and parcours_id is null and statut = 'faite' order by parcours_rang nulls first limit 1`, [U])).rows[0];
t("supprimer un programme laisse ses séances, sans lien", !!orphelin && orphelin.parcours_id === null && orphelin.parcours_rang === null);
t("supprimer un compte ne bute sur rien", (await erreur(`delete from auth.users where id = '${U}'`)) === null);
t("ses programmes et ses séances partent avec lui", (await q(`select count(*)::int as n from public.parcours where user_id = $1`, [U])).rows[0].n === 0
  && (await q(`select count(*)::int as n from public.intentions_entrainement where user_id = $1`, [U])).rows[0].n === 0);

/* ── Les droits ── */
const droits = (await q(`select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as auth
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname in ('commencer_parcours', 'changer_jours_parcours', 'arreter_parcours', 'noter_test_parcours')`)).rows;
t("les quatre fonctions existent", droits.length === 4);
t("aucune n'est ouverte sans compte", droits.every((d) => d.anon === false));
t("toutes sont ouvertes aux comptes connectés", droits.every((d) => d.auth === true));

console.log(`\n${ok} contrôles passent, ${ko} échouent.`);
if (ko > 0) process.exit(1);
