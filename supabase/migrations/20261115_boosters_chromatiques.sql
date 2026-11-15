create or replace function public.ouvrir_booster_exercices_v2(p_apercu boolean default false)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  compte uuid := auth.uid();
  aujourd_hui date := (now() at time zone 'Europe/Paris')::date;
  cartes_du_jour jsonb;
  chance double precision;
  raretes text[];
begin
  if compte is null then raise exception 'Connexion requise'; end if;
  select cartes into cartes_du_jour
  from public.boosters_exercices where user_id = compte and jour = aujourd_hui;
  if p_apercu or cartes_du_jour is not null then return cartes_du_jour; end if;

  chance := random();
  raretes := case
    when chance < .60 then array['commune','commune','epique']
    when chance < .90 then array['commune','epique','epique']
    when chance < .95 then array['commune','epique','legendaire']
    when chance < .99 then array['epique','epique','legendaire']
    else array['epique','legendaire','chromatique']
  end;
  select jsonb_agg(jsonb_build_object('exercice', exercice, 'rarete', raretes[position::int]) order by position)
    into cartes_du_jour
    from (
      select exercice, row_number() over (order by ordre) as position
      from (
        select exercice, random() as ordre
        from unnest(array['pompes','crunch','fentes','squat','pompesdiamant','pompesinclinees','pompesexplosives','squatsaute','squatbulgare','fentessautees','bicyclecrunch','reversecrunch','relevesjambes','deadbug','birddog','hipthrust','dips','rowinginverse','stepupbanc','mountainclimbers','burpees','abducteursmachine','corde']) as catalogue(exercice)
        order by ordre limit 3
      ) tirage
    ) cartes;
  insert into public.boosters_exercices (user_id, jour, cartes)
    values (compte, aujourd_hui, cartes_du_jour) on conflict do nothing;
  return (select cartes from public.boosters_exercices where user_id = compte and jour = aujourd_hui);
end;
$$;
revoke all on function public.ouvrir_booster_exercices_v2(boolean) from public;
grant execute on function public.ouvrir_booster_exercices_v2(boolean) to authenticated;
