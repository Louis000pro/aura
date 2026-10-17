/* ════════════════════════════════════════════════════════════════════
   check:mouvement-sql · LA MIGRATION DU MOUVEMENT DU JOUR, JOUÉE POUR
   DE VRAI, HORS LIGNE

     npm run check:mouvement-sql

   Une base PostgreSQL en mémoire (PGlite), le schéma minimal dont la
   migration dépend (le registre des crédits, `crediter_mission_aura`
   recopiée de la base, et deux bouchons pour la série et les jours
   actifs, que cette migration ne touche pas), puis
   `20261017_mouvement_du_jour.sql` elle-même, deux fois : elle doit être
   rejouable.

   CE QU'IL PROTÈGE (Louis, 2026-10-17) : retourner la carte rapporte
   5 EXP, une fois par jour parisien, au compte qui la retourne et à
   personne d'autre ; rien d'autre ne bouge (journée complète, série,
   journée validée) ; et la base crédite exactement le nombre que la
   carte annonce.

   Ce banc ne remplace pas l'essai sur la vraie base (droits Supabase,
   deux appels réellement simultanés : PGlite n'a qu'une connexion) : il
   empêche de casser ce qu'il exerce.
   ════════════════════════════════════════════════════════════════════ */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { EXP_MOUVEMENT, MISSIONS } from "@/lib/aura";

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
create table public.profiles (id uuid primary key, is_premium boolean default false, is_admin boolean default false);
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
  constraint aura_mission_credits_mission_id_check check (mission_id = any (array[
    'connexion', 'seance', 'repas', 'journee_complete', 'double_seance', 'leve_tot',
    'nutrition_complete', 'objectif_accompli', 'semaine_active', 'semaine_reguliere',
    'semaine_parfaite', 'semaine_intense'])),
  unique (user_id, mission_id, period_key)
);
-- Les deux dépendances d'etat_missions_aura que la migration ne touche pas.
create function public.jours_actifs_aura(p_user uuid, p_debut date, p_fin date) returns date[] language sql stable as $$ select array[]::date[] $$;
create function public.serie_aura(p_user uuid) returns integer language sql stable as $$ select 0 $$;
-- Recopiée de la base (2026-10-17), identique à 20260821_economie_exp_v2.sql.
create function public.crediter_mission_aura(p_user uuid, p_mission text, p_period_type text, p_period_key text, p_points numeric, p_premium_only boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare v_premium boolean;
begin
  if p_premium_only then
    select coalesce(is_premium, false) or coalesce(is_admin, false) into v_premium from public.profiles where id = p_user;
    if not coalesce(v_premium, false) then return; end if;
  end if;
  insert into public.aura_mission_credits (user_id, mission_id, period_type, period_key, points)
  values (p_user, p_mission, p_period_type, p_period_key, p_points)
  on conflict (user_id, mission_id, period_key) do nothing;
end $$;
`);

const mig = readFileSync(new URL("../supabase/migrations/20261017_mouvement_du_jour.sql", import.meta.url), "utf8");
await ex(mig);
await ex(mig);
t("la migration est rejouable", true);

const U = "11111111-1111-1111-1111-111111111111";
const V = "22222222-2222-2222-2222-222222222222";
await ex(`insert into auth.users values ('${U}'), ('${V}'); insert into public.profiles (id) values ('${U}'), ('${V}');`);
const sessionDe = (u: string) => ex(`select set_config('test.uid', '${u}', false)`);
const decouvrir = async () => (await q(`select public.decouvrir_mouvement_aura() as r`)).rows[0].r as boolean | null;
const etat = async (u: string) => (await q(`select public.etat_missions_aura($1::uuid) as e`, [u])).rows[0].e;
const lignes = async (u: string) => (await q(
  `select mission_id, period_type, period_key, points from public.aura_mission_credits where user_id = $1 order by period_key`,
  [u],
)).rows;
const jour: string = (await q(`select (now() at time zone 'Europe/Paris')::date::text as j`)).rows[0].j;

/* ── Sans session ── */
await sessionDe("");
t("sans session : rien de crédité", (await decouvrir()) === null && (await lignes(U)).length === 0, "NULL");

/* ── Le premier toucher, puis le second ── */
await sessionDe(U);
const avant = await etat(U);
t("l'état reste en version 2", avant?.version === 2, String(avant?.version));
t("avant : la mission est à faire", avant.missions.mouvement.complete === false && avant.missions.mouvement.target === 1, JSON.stringify(avant.missions.mouvement));
const premier = await decouvrir();
const second = await decouvrir();
t("premier toucher du jour : crédité", premier === true, String(premier));
t("second toucher le même jour : rien de plus", second === false, String(second));
const l = await lignes(U);
t(
  "une seule ligne, au jour parisien",
  l.length === 1 && l[0].mission_id === "mouvement_du_jour" && l[0].period_type === "day" && l[0].period_key === jour,
  l.map((x) => `${x.mission_id} ${x.period_key}`).join(", "),
);
t("la base crédite exactement ce que la carte annonce", Number(l[0]?.points) === EXP_MOUVEMENT, `${l[0]?.points} = ${EXP_MOUVEMENT}`);
const apres = await etat(U);
t("après : faite et gagnée", apres.missions.mouvement.complete === true && apres.missions.mouvement.earned === true && apres.missions.mouvement.progress === 1, JSON.stringify(apres.missions.mouvement));
t("l'EXP monte de 5, et de 5 seulement", apres.exp === avant.exp + EXP_MOUVEMENT, `${avant.exp} → ${apres.exp}`);
t("la journée complète ne bouge pas", apres.missions.journee.progress === avant.missions.journee.progress, String(apres.missions.journee.progress));
t("la carte ne valide pas la journée", apres.jourValide === false, String(apres.jourValide));

/* ── Personne d'autre ── */
await sessionDe(V);
const autre = await etat(V);
t("l'autre compte n'a rien reçu", autre.missions.mouvement.complete === false && autre.exp === 10, `${autre.exp} EXP`);
t("on ne lit pas l'état d'un autre compte", (await etat(U)) === null, "NULL");

/* ── Un autre jour ── */
await q(
  `insert into public.aura_mission_credits (user_id, mission_id, period_type, period_key, points) values ($1, 'mouvement_du_jour', 'day', ($2::date - 1)::text, 5)`,
  [V, jour],
);
t("la carte d'hier ne compte pas aujourd'hui", (await etat(V)).missions.mouvement.complete === false, "à faire");
t("et aujourd'hui se crédite quand même", (await decouvrir()) === true && (await lignes(V)).length === 2, "deux jours, deux lignes");

/* ── Le registre reste fermé ── */
let refuse = false;
try {
  await q(`insert into public.aura_mission_credits (user_id, mission_id, period_type, period_key, points) values ($1, 'mouvement_inconnu', 'day', $2, 5)`, [V, jour]);
} catch {
  refuse = true;
}
t("un identifiant inconnu reste refusé", refuse, "CHECK");

/* ── Les droits ── */
const droit = async (role: string) =>
  (await q(`select has_function_privilege($1, 'public.decouvrir_mouvement_aura()', 'execute') as d`, [role])).rows[0].d as boolean;
t("un visiteur sans compte ne peut pas l'appeler", (await droit("anon")) === false, "anon");
t("un compte connecté peut", (await droit("authenticated")) === true, "authenticated");

/* ── Le catalogue et la base parlent des mêmes missions ── */
const manquantes = MISSIONS.filter((m) => !(m.id in apres.missions)).map((m) => m.id);
t("chaque mission du catalogue a son état en base", manquantes.length === 0, manquantes.join(", ") || `${MISSIONS.length} missions`);

console.log(ko === 0 ? `\nTout passe (${ok}).` : `\n${ko} échec(s) sur ${ok + ko}.`);
process.exit(ko === 0 ? 0 : 1);
