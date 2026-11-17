-- Les boosters se gardent : un nouveau toutes les 3 heures, jusqu'à 3 en réserve (Louis, 2026-11-17).
-- La réserve se DÉRIVE de l'historique des ouvertures, rien n'est stocké.
begin;

create or replace function public.reserve_booster(p_user uuid, p_maintenant timestamptz,
  out stock int, out prochain timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
declare
  o timestamptz;
  ancre timestamptz;   -- départ de la recharge en cours (null = réserve pleine)
  gagnes int;
begin
  stock := 3;
  for o in select ouvert_le from public.boosters_illimites
    where user_id = p_user and cadence_3h order by ouvert_le, requete_id
  loop
    if ancre is not null then
      gagnes := floor(extract(epoch from (o - ancre)) / 10800)::int;
      stock := least(3, stock + gagnes);
      ancre := case when stock >= 3 then null else ancre + gagnes * interval '3 hours' end;
    end if;
    stock := greatest(0, stock - 1);
    if ancre is null then ancre := o; end if;
  end loop;
  if ancre is not null then
    gagnes := floor(extract(epoch from (p_maintenant - ancre)) / 10800)::int;
    stock := least(3, stock + gagnes);
    ancre := case when stock >= 3 then null else ancre + gagnes * interval '3 hours' end;
  end if;
  prochain := ancre + interval '3 hours';
end;
$$;
revoke all on function public.reserve_booster(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.reserve_booster(uuid, timestamptz) to service_role;

create or replace function public.ouvrir_booster_exercices_v4(p_requete uuid default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  compte uuid := auth.uid();
  tirage public.boosters_illimites%rowtype;
  r record;
  maintenant timestamptz;
  gain numeric;
begin
  if compte is null then raise exception 'Connexion requise'; end if;
  if p_requete is not null then
    perform pg_advisory_xact_lock(hashtextextended('booster-3h:' || compte::text, 0));
  end if;
  maintenant := clock_timestamp();
  select * into r from public.reserve_booster(compte, maintenant);

  if p_requete is not null then
    select * into tirage from public.boosters_illimites
      where user_id = compte and requete_id = p_requete and cadence_3h;
    if not found and r.stock > 0 then
      insert into public.boosters_illimites (user_id, requete_id, cartes, ouvert_le, cadence_3h)
        values (compte, p_requete, public.tirer_booster_exercices(), maintenant, true)
        returning * into tirage;
      select * into r from public.reserve_booster(compte, maintenant);
    end if;
    if tirage.requete_id is not null then
      select points into gain from public.aura_mission_credits
        where user_id = compte and mission_id = 'booster'
          and period_key = 'illimite:' || tirage.requete_id::text;
    end if;
  end if;

  return jsonb_build_object('cartes', tirage.cartes, 'exp', coalesce(gain, 0),
    'stock', r.stock,
    'prochain', case when r.prochain > maintenant then r.prochain end,
    'maintenant', maintenant);
end;
$$;
revoke all on function public.ouvrir_booster_exercices_v4(uuid) from public, anon;
grant execute on function public.ouvrir_booster_exercices_v4(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
