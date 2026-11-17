-- Le pack d'exception (Louis, 2026-11-17) : 0,5 % des boosters n'ont que des épiques, légendaires
-- ou chromatiques (pour chaque carte : 50 % épique, 40 % légendaire, 10 % chromatique), la meilleure
-- en dernier. Sinon, les chances cumulées habituelles. Rejouable.
create or replace function public.tirer_booster_exercices(p_user uuid)
returns jsonb language sql volatile set search_path = '' as $$
  with c as (select public.chances_booster(p_user) as ch, random() * 100 as t, random() < .005 as exception),
  tirage as (
    select case when exception then (
      select array_agg(r order by array_position(array['epique','legendaire','chromatique'], r))
      from (select case when x < .5 then 'epique' when x < .9 then 'legendaire' else 'chromatique' end as r
            from (select random() as x from generate_series(1, 3)) a) b)
    else array['commune', 'rare', case
      when t < (ch->>'rare')::numeric then 'rare'
      when t < (ch->>'rare')::numeric + (ch->>'epique')::numeric then 'epique'
      when t < 100 - (ch->>'chromatique')::numeric then 'legendaire'
      else 'chromatique' end] end as raretes from c
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
revoke all on function public.tirer_booster_exercices(uuid) from public, anon, authenticated;
