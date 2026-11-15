begin;

-- Trois cartes distinctes. Les probabilités décrivent la présence d'une
-- rareté par booster et la meilleure carte reste en dernière position.
create or replace function public.raretes_booster_exercices(p_ticket integer)
returns text[]
language sql immutable strict
set search_path = ''
as $$
  select case
    when p_ticket < 10 then array['commune', 'commune', 'commune']
    when p_ticket < 44 then array['commune', 'commune', 'rare']
    when p_ticket < 54 then array['commune', 'rare', 'rare']
    when p_ticket < 88 then array['commune', 'rare', 'epique']
    when p_ticket < 98 then array['commune', 'rare', 'legendaire']
    else array['commune', 'rare', 'chromatique']
  end
$$;
revoke all on function public.raretes_booster_exercices(integer) from public, anon, authenticated;

create or replace function public.tirer_booster_exercices()
returns jsonb
language sql volatile
set search_path = ''
as $$
  with tirage as (
    select public.raretes_booster_exercices(floor(random() * 100)::integer) as raretes
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
  ), cartes as (
    select exercice, row_number() over (order by ordre)::integer as position
    from mouvements
  )
  select jsonb_agg(
    jsonb_build_object('exercice', exercice, 'rarete', raretes[position]) order by position
  )
  from cartes cross join tirage
$$;
revoke all on function public.tirer_booster_exercices() from public, anon, authenticated;

-- La v3 appelle la v2. Son enregistrement et le déclencheur EXP restent valides.
create or replace function public.ouvrir_booster_exercices_v2(p_apercu boolean default false)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  compte uuid := auth.uid();
  aujourd_hui date := (now() at time zone 'Europe/Paris')::date;
  cartes_du_jour jsonb;
begin
  if compte is null then raise exception 'Connexion requise'; end if;
  select cartes into cartes_du_jour
  from public.boosters_exercices where user_id = compte and jour = aujourd_hui;
  if p_apercu or cartes_du_jour is not null then return cartes_du_jour; end if;

  insert into public.boosters_exercices (user_id, jour, cartes)
    values (compte, aujourd_hui, public.tirer_booster_exercices()) on conflict do nothing;
  return (select cartes from public.boosters_exercices where user_id = compte and jour = aujourd_hui);
end;
$$;
revoke all on function public.ouvrir_booster_exercices_v2(boolean) from public, anon;
grant execute on function public.ouvrir_booster_exercices_v2(boolean) to authenticated;

-- Les clients qui utilisent encore la première RPC suivent le même tirage.
create or replace function public.ouvrir_booster_exercices()
returns jsonb
language sql volatile security definer set search_path = ''
as $$
  select public.ouvrir_booster_exercices_v2(false)
$$;
revoke all on function public.ouvrir_booster_exercices() from public, anon;
grant execute on function public.ouvrir_booster_exercices() to authenticated;

-- L'API vérifie le compte d'essai. La clé de requête conserve l'idempotence
-- du tirage et du crédit d'EXP, y compris en cas de reprise réseau.
create or replace function public.ouvrir_booster_illimite(p_compte uuid, p_requete uuid)
returns jsonb
language sql volatile security definer set search_path = ''
as $$
  select public.enregistrer_booster_illimite(p_compte, p_requete, public.tirer_booster_exercices())
$$;
revoke all on function public.ouvrir_booster_illimite(uuid, uuid) from public, anon, authenticated;
grant execute on function public.ouvrir_booster_illimite(uuid, uuid) to service_role;

notify pgrst, 'reload schema';
commit;
