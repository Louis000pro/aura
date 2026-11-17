begin;

-- Les tirages d'essai et les cadeaux continuent d'utiliser la même collection.
alter table public.boosters_illimites
  add column if not exists cadence_3h boolean not null default false;
create index if not exists boosters_cadence_3h_dernier
  on public.boosters_illimites (user_id, ouvert_le desc, requete_id)
  where cadence_3h;

create or replace function public.ouvrir_booster_exercices_v4(p_requete uuid default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  compte uuid := auth.uid();
  dernier public.boosters_illimites%rowtype;
  tirage public.boosters_illimites%rowtype;
  prochain timestamptz;
  maintenant timestamptz;
  gain numeric;
begin
  if compte is null then raise exception 'Connexion requise'; end if;

  if p_requete is not null then
    perform pg_advisory_xact_lock(hashtextextended('booster-3h:' || compte::text, 0));
  end if;
  maintenant := clock_timestamp();
  select * into dernier from public.boosters_illimites
    where user_id = compte and cadence_3h
    order by ouvert_le desc, requete_id limit 1;
  prochain := dernier.ouvert_le + interval '3 hours';

  if p_requete is not null then
    select * into tirage from public.boosters_illimites
      where user_id = compte and requete_id = p_requete and cadence_3h;
    if not found and (prochain is null or prochain <= maintenant) then
      insert into public.boosters_illimites (user_id, requete_id, cartes, ouvert_le, cadence_3h)
        values (compte, p_requete, public.tirer_booster_exercices(), maintenant, true)
        returning * into tirage;
      prochain := maintenant + interval '3 hours';
    end if;
    if tirage.requete_id is not null then
      select points into gain from public.aura_mission_credits
        where user_id = compte and mission_id = 'booster'
          and period_key = 'illimite:' || tirage.requete_id::text;
    end if;
  end if;

  return jsonb_build_object('cartes', tirage.cartes, 'exp', coalesce(gain, 0),
    'prochain', case when prochain > maintenant then prochain end,
    'maintenant', maintenant);
end;
$$;
revoke all on function public.ouvrir_booster_exercices_v4(uuid) from public, anon;
grant execute on function public.ouvrir_booster_exercices_v4(uuid) to authenticated;

-- Les clients encore ouverts ne peuvent pas contourner le délai via les anciennes RPC.
create or replace function public.ouvrir_booster_exercices_v3()
returns jsonb
language sql security definer set search_path = ''
as $$
  select public.ouvrir_booster_exercices_v4(gen_random_uuid())
$$;

create or replace function public.ouvrir_booster_exercices_v2(p_apercu boolean default false)
returns jsonb
language sql security definer set search_path = ''
as $$
  select case when p_apercu then (
    select cartes from public.boosters_illimites
      where user_id = auth.uid() and cadence_3h and ouvert_le > now() - interval '3 hours'
      order by ouvert_le desc, requete_id limit 1
  ) else public.ouvrir_booster_exercices_v4(gen_random_uuid())->'cartes' end
$$;

notify pgrst, 'reload schema';
commit;
