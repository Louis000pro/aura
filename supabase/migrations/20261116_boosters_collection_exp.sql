begin;

alter table public.aura_mission_credits
  drop constraint if exists aura_mission_credits_mission_id_check;
alter table public.aura_mission_credits
  add constraint aura_mission_credits_mission_id_check check (mission_id in (
    'connexion', 'seance', 'repas', 'journee_complete',
    'double_seance', 'leve_tot', 'nutrition_complete', 'objectif_accompli',
    'semaine_active', 'semaine_reguliere', 'semaine_parfaite', 'semaine_intense',
    'mouvement_du_jour', 'relais_gagne', 'booster'
  ));

alter table public.aura_mission_credits
  drop constraint if exists aura_mission_credits_period_type_check;
alter table public.aura_mission_credits
  add constraint aura_mission_credits_period_type_check
  check (period_type in ('day', 'week', 'relais', 'booster'));

create table if not exists public.boosters_illimites (
  user_id uuid not null references auth.users(id) on delete cascade,
  requete_id uuid not null,
  cartes jsonb not null,
  ouvert_le timestamptz not null default now(),
  primary key (user_id, requete_id)
);
create index if not exists boosters_illimites_chronologie
  on public.boosters_illimites (user_id, ouvert_le desc, requete_id);

alter table public.boosters_illimites enable row level security;
revoke all on public.boosters_illimites from public, anon, authenticated;
grant select on public.boosters_illimites to authenticated;
drop policy if exists "Lire ses boosters illimités" on public.boosters_illimites;
create policy "Lire ses boosters illimités" on public.boosters_illimites
  for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.crediter_booster_aura()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  cle text;
  total integer;
begin
  if tg_table_name = 'boosters_exercices' then
    cle := 'jour:' || new.jour::text;
  else
    cle := 'illimite:' || new.requete_id::text;
  end if;

  select coalesce(sum(case carte->>'rarete'
    when 'commune' then 5
    when 'rare' then 8
    when 'epique' then 10
    when 'legendaire' then 20
    when 'chromatique' then 30
    else 0
  end), 0) into total
  from jsonb_array_elements(new.cartes) carte;

  if total > 0 then
    perform public.crediter_mission_aura(new.user_id, 'booster', 'booster', cle, total, false);
  end if;
  return new;
end;
$$;
revoke all on function public.crediter_booster_aura() from public, anon, authenticated;

drop trigger if exists booster_credit_aura on public.boosters_exercices;
create trigger booster_credit_aura after insert on public.boosters_exercices
  for each row execute function public.crediter_booster_aura();

drop trigger if exists booster_credit_aura on public.boosters_illimites;
create trigger booster_credit_aura after insert on public.boosters_illimites
  for each row execute function public.crediter_booster_aura();

create or replace function public.ouvrir_booster_exercices_v3()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  compte uuid := auth.uid();
  jour_paris date := (now() at time zone 'Europe/Paris')::date;
  tirage jsonb;
  gain numeric;
begin
  if compte is null then raise exception 'Connexion requise'; end if;
  tirage := public.ouvrir_booster_exercices_v2(false);
  select points into gain from public.aura_mission_credits
    where user_id = compte and mission_id = 'booster' and period_key = 'jour:' || jour_paris::text;
  return jsonb_build_object('cartes', tirage, 'exp', coalesce(gain, 0));
end;
$$;
revoke all on function public.ouvrir_booster_exercices_v3() from public, anon;
grant execute on function public.ouvrir_booster_exercices_v3() to authenticated;

create or replace function public.enregistrer_booster_illimite(p_compte uuid, p_requete uuid, p_cartes jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  resultat jsonb;
begin
  insert into public.boosters_illimites (user_id, requete_id, cartes)
    values (p_compte, p_requete, p_cartes) on conflict do nothing;

  select jsonb_build_object('cartes', b.cartes, 'exp', coalesce(c.points, 0))
    into resultat
  from public.boosters_illimites b
  left join public.aura_mission_credits c on c.user_id = b.user_id and c.mission_id = 'booster'
    and c.period_key = 'illimite:' || b.requete_id::text
  where b.user_id = p_compte and b.requete_id = p_requete;
  return resultat;
end;
$$;
revoke all on function public.enregistrer_booster_illimite(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.enregistrer_booster_illimite(uuid, uuid, jsonb) to service_role;

notify pgrst, 'reload schema';
commit;
