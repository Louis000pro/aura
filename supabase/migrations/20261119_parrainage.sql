-- Parrainage : 3 boosters par nouveau compte vérifié, +1 au troisième filleul.
-- La réserve bonus ne change ni la cadence des 3 heures ni le plafond habituel.
begin;
create table if not exists public.codes_parrainage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique default replace(gen_random_uuid()::text, '-', '')
);
create table if not exists public.parrainages (
  id uuid primary key default gen_random_uuid(),
  filleul uuid unique references auth.users(id) on delete set null,
  email_hash text not null unique,
  parrain uuid not null references auth.users(id) on delete cascade,
  valide_le timestamptz not null default now(),
  recompense int not null check (recompense in (3,4)),
  check (filleul <> parrain)
);
create index if not exists parrainages_parrain on public.parrainages(parrain);
create table if not exists public.boosters_bonus_ouverts (
  user_id uuid not null references auth.users(id) on delete cascade,
  requete_id uuid not null,
  primary key(user_id, requete_id),
  foreign key(user_id, requete_id) references public.boosters_illimites(user_id, requete_id)
    on delete cascade deferrable initially deferred
);
alter table public.codes_parrainage enable row level security;
alter table public.parrainages enable row level security;
alter table public.boosters_bonus_ouverts enable row level security;
revoke all on public.codes_parrainage, public.parrainages, public.boosters_bonus_ouverts from public, anon, authenticated;
grant select, insert, update, delete on public.codes_parrainage, public.parrainages, public.boosters_bonus_ouverts to service_role;

create or replace function public.bonus_parrainage(p_user uuid) returns int
language sql stable security definer set search_path = '' as $$
  select greatest(0, coalesce((select sum(recompense) from public.parrainages where parrain=p_user),0)
    - (select count(*) from public.boosters_bonus_ouverts where user_id=p_user))::int
$$;
revoke all on function public.bonus_parrainage(uuid) from public, anon, authenticated;
grant execute on function public.bonus_parrainage(uuid) to service_role;

create or replace function public.etat_parrainage(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare lien text; n int; total int;
begin
  if not exists(select 1 from public.profiles where id=p_user and not coalesce(is_banned,false)) then
    raise exception 'Compte indisponible';
  end if;
  insert into public.codes_parrainage(user_id) values(p_user) on conflict(user_id) do nothing;
  select code into lien from public.codes_parrainage where user_id=p_user;
  select count(*),coalesce(sum(recompense),0) into n,total from public.parrainages where parrain=p_user;
  return jsonb_build_object('actif',now()>='2026-11-19 00:00:00 Europe/Paris'::timestamptz,
    'code',lien,'amis',n,'gagnes',total,'bonus',public.bonus_parrainage(p_user));
end;
$$;
revoke all on function public.etat_parrainage(uuid) from public, anon, authenticated;
grant execute on function public.etat_parrainage(uuid) to service_role;

create or replace function public.valider_parrainage(p_user uuid,p_code text,p_arrivee timestamptz) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare parent uuid; n int; gagne int; inscrit timestamptz; confirme timestamptz; nouveau uuid; mail text;
begin
  if now()<'2026-11-19 00:00:00 Europe/Paris'::timestamptz then return jsonb_build_object('valide',false,'raison','pas_encore'); end if;
  if p_arrivee is null or p_arrivee < now()-interval '7 days' or p_arrivee > now()+interval '1 minute' then
    return jsonb_build_object('valide',false,'raison','lien_expire');
  end if;
  select c.user_id into parent from public.codes_parrainage c join public.profiles p on p.id=c.user_id
    where c.code=p_code and not coalesce(p.is_banned,false);
  select created_at,email_confirmed_at,email into inscrit,confirme,mail from auth.users where id=p_user;
  if parent is null or parent=p_user or inscrit is null or inscrit<p_arrivee then
    return jsonb_build_object('valide',false,'raison','compte_non_eligible');
  end if;
  if confirme is null or mail is null or not exists(select 1 from public.profiles where id=p_user and onboarding_completed) then
    return jsonb_build_object('valide',false,'raison','inscription_en_cours');
  end if;
  if exists(select 1 from public.profiles where id=p_user and coalesce(is_banned,false)) then
    return jsonb_build_object('valide',false,'raison','compte_non_eligible');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('parrainage:'||parent::text,0));
  select count(*) into n from public.parrainages where parrain=parent;
  gagne:=case when n=2 then 4 else 3 end;
  insert into public.parrainages(filleul,parrain,recompense,email_hash)
    values(p_user,parent,gagne,encode(sha256(convert_to(lower(trim(mail)),'UTF8')),'hex'))
    on conflict do nothing returning id into nouveau;
  return jsonb_build_object('valide',true,'nouveau',nouveau is not null);
end;
$$;
revoke all on function public.valider_parrainage(uuid,text,timestamptz) from public, anon, authenticated;
grant execute on function public.valider_parrainage(uuid,text,timestamptz) to service_role;

-- Même calcul que la réserve actuelle, en excluant les ouvertures bonus.
create or replace function public.reserve_booster(p_user uuid,p_maintenant timestamptz,
  out stock int,out prochain timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare o timestamptz; ancre timestamptz; gagnes int;
begin
  stock:=3;
  for o in select b.ouvert_le from public.boosters_illimites b where b.user_id=p_user and b.cadence_3h
    and not exists(select 1 from public.boosters_bonus_ouverts x where x.user_id=b.user_id and x.requete_id=b.requete_id)
    order by b.ouvert_le,b.requete_id
  loop
    if ancre is not null then
      gagnes:=floor(extract(epoch from(o-ancre))/10800)::int;
      stock:=least(3,stock+gagnes);
      ancre:=case when stock>=3 then null else ancre+gagnes*interval '3 hours' end;
    end if;
    stock:=greatest(0,stock-1);
    if ancre is null then ancre:=o; end if;
  end loop;
  if ancre is not null then
    gagnes:=floor(extract(epoch from(p_maintenant-ancre))/10800)::int;
    stock:=least(3,stock+gagnes);
    ancre:=case when stock>=3 then null else ancre+gagnes*interval '3 hours' end;
  end if;
  prochain:=ancre+interval '3 hours';
end;
$$;
revoke all on function public.reserve_booster(uuid,timestamptz) from public, anon, authenticated;
grant execute on function public.reserve_booster(uuid,timestamptz) to service_role;

create or replace function public.ouvrir_booster_exercices_v5(p_requete uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare compte uuid:=auth.uid(); tirage public.boosters_illimites%rowtype; r record; bonus int; gain numeric; maintenant timestamptz;
begin
  if compte is null then raise exception 'Connexion requise'; end if;
  perform pg_advisory_xact_lock(hashtextextended('booster-3h:'||compte::text,0));
  maintenant:=clock_timestamp();
  select * into r from public.reserve_booster(compte,maintenant);
  bonus:=public.bonus_parrainage(compte);
  if p_requete is not null then
    select * into tirage from public.boosters_illimites where user_id=compte and requete_id=p_requete and cadence_3h;
    if not found and (bonus>0 or r.stock>0) then
      if bonus>0 then insert into public.boosters_bonus_ouverts(user_id,requete_id) values(compte,p_requete); end if;
      insert into public.boosters_illimites(user_id,requete_id,cartes,ouvert_le,cadence_3h)
        values(compte,p_requete,public.tirer_booster_exercices(),maintenant,true) returning * into tirage;
      select * into r from public.reserve_booster(compte,maintenant);
      bonus:=public.bonus_parrainage(compte);
    end if;
    if tirage.requete_id is not null then
      select points into gain from public.aura_mission_credits where user_id=compte and mission_id='booster'
        and period_key='illimite:'||tirage.requete_id::text;
    end if;
  end if;
  return jsonb_build_object('cartes',tirage.cartes,'exp',coalesce(gain,0),'stock',r.stock+bonus,
    'stock_habituel',r.stock,'bonus',bonus,'prochain',case when r.prochain>maintenant then r.prochain end,'maintenant',maintenant);
end;
$$;
revoke all on function public.ouvrir_booster_exercices_v5(uuid) from public, anon;
grant execute on function public.ouvrir_booster_exercices_v5(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
