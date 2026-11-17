-- Chances cumulées (Louis, 2026-11-17) : base 60 % rare, 30 % épique, 9 % légendaire, 1 % chromatique.
-- Chaque booster d'affilée dont la meilleure carte n'était qu'une rare retire 8 points à la rare
-- (plancher 20 %), redistribués : 5/8 à l'épique, 2/8 à la légendaire, 1/8 à la chromatique.
-- Une épique ou mieux remet le compteur à zéro. Rejouable.

create or replace function public.rares_affilee_booster(p_user uuid)
returns integer language sql stable set search_path = '' as $$
  with ouverts as (
    select ouvert_le as quand, cartes->2->>'rarete' as meilleure from public.boosters_illimites where user_id = p_user
    union all
    select jour::timestamptz, cartes->2->>'rarete' from public.boosters_exercices where user_id = p_user
  ), ranges as (select meilleure, row_number() over (order by quand desc) as n from ouverts)
  select coalesce(min(n) - 1, (select count(*) from ranges))::integer
  from ranges where meilleure is distinct from 'rare'
$$;

create or replace function public.chances_booster(p_user uuid)
returns jsonb language sql stable set search_path = '' as $$
  with s as (select least(public.rares_affilee_booster(p_user), 5) * 8.0 as extra)
  select jsonb_build_object('rare', 60 - extra, 'epique', 30 + extra * .625,
    'legendaire', 9 + extra * .25, 'chromatique', 1 + extra * .125, 'affilee', extra / 8) from s
$$;

create or replace function public.tirer_booster_exercices(p_user uuid)
returns jsonb language sql volatile set search_path = '' as $$
  with c as (select public.chances_booster(p_user) as ch, random() * 100 as t),
  tirage as (
    select array['commune', 'rare', case
      when t < (ch->>'rare')::numeric then 'rare'
      when t < (ch->>'rare')::numeric + (ch->>'epique')::numeric then 'epique'
      when t < 100 - (ch->>'chromatique')::numeric then 'legendaire'
      else 'chromatique' end] as raretes from c
  ), mouvements as (
    select exercice, random() as ordre
    from unnest(array[
      'pompes', 'crunch', 'fentes', 'squat', 'pompesdiamant', 'pompesinclinees',
      'pompesexplosives', 'squatsaute', 'squatbulgare', 'fentessautees',
      'bicyclecrunch', 'reversecrunch', 'relevesjambes', 'deadbug', 'birddog',
      'hipthrust', 'dips', 'rowinginverse', 'stepupbanc', 'mountainclimbers',
      'burpees', 'abducteursmachine', 'corde'
    ]) as catalogue(exercice)
    order by ordre limit 3
  ), cartes as (select exercice, row_number() over (order by ordre)::integer as position from mouvements)
  select jsonb_agg(jsonb_build_object('exercice', exercice, 'rarete', raretes[position]) order by position)
  from cartes cross join tirage
$$;

-- L'ancienne version sans compte garde les chances de base.
create or replace function public.tirer_booster_exercices()
returns jsonb language sql volatile set search_path = '' as $$ select public.tirer_booster_exercices(null::uuid) $$;

-- Les deux ouvertures passent le compte au tirage.
do $$ begin
  execute replace(pg_get_functiondef('public.ouvrir_booster_exercices_v4(uuid)'::regprocedure),
    'public.tirer_booster_exercices()', 'public.tirer_booster_exercices(compte)');
  execute replace(pg_get_functiondef('public.ouvrir_booster_illimite(uuid,uuid)'::regprocedure),
    'public.tirer_booster_exercices()', 'public.tirer_booster_exercices(p_compte)');
end $$;

revoke all on function public.rares_affilee_booster(uuid), public.tirer_booster_exercices(uuid), public.tirer_booster_exercices() from public, anon, authenticated;
revoke all on function public.chances_booster(uuid) from public, anon;
grant execute on function public.chances_booster(uuid) to authenticated;

-- Ce que l'écran lit : mes chances du prochain booster.
create or replace function public.mes_chances_booster()
returns jsonb language sql stable security definer set search_path = '' as $$ select public.chances_booster(auth.uid()) $$;
revoke all on function public.mes_chances_booster() from public, anon;
grant execute on function public.mes_chances_booster() to authenticated;
revoke execute on function public.chances_booster(uuid) from authenticated;
