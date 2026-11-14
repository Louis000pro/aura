create table public.boosters_exercices (
  user_id uuid not null references auth.users(id) on delete cascade,
  jour date not null,
  cartes jsonb not null,
  primary key (user_id, jour)
);

alter table public.boosters_exercices enable row level security;
revoke all on public.boosters_exercices from anon, authenticated;
grant select on public.boosters_exercices to authenticated;
create policy "Lire ses boosters" on public.boosters_exercices
  for select to authenticated using ((select auth.uid()) = user_id);

create function public.ouvrir_booster_exercices()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  compte uuid := auth.uid();
  aujourd_hui date := (now() at time zone 'Europe/Paris')::date;
  cartes_du_jour jsonb;
begin
  if compte is null then raise exception 'Connexion requise'; end if;
  select jsonb_agg(jsonb_build_object('exercice', exercice, 'rarete', rarete) order by position)
    into cartes_du_jour
    from (
      select row_number() over (order by ordre) as position, exercice
      from (
        select exercice, random() as ordre from unnest(array['pompes','crunch','fentes','squat']) as exercices_disponibles(exercice)
        order by ordre limit 3
      ) tirage
    ) exercices
    cross join lateral (
      select case when position = 3 then
        case when random() < .25 then 'epique' else 'rare' end
        when random() < .30 then 'rare' else 'commune' end as rarete
    ) raretes;
  insert into public.boosters_exercices (user_id, jour, cartes)
    values (compte, aujourd_hui, cartes_du_jour) on conflict do nothing;
  return (select cartes from public.boosters_exercices where user_id = compte and jour = aujourd_hui);
end;
$$;
revoke all on function public.ouvrir_booster_exercices() from public;
grant execute on function public.ouvrir_booster_exercices() to authenticated;
