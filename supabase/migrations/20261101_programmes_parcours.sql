-- ════════════════════════════════════════════════════════════════════
-- LES PROGRAMMES (« parcours ») · GO de Louis le 2026-11-01
-- (« ok pour les programmes ! », maquette « Les programmes », version 2)
--
-- Un programme, c'est quelques semaines de séances du catalogue pour un
-- but, avec un test au début et le même à la fin.
--
-- ⚠️ RIEN N'EST ÉCRIT D'AVANCE. Une ligne de `parcours` porte le
-- programme choisi, les jours, le départ et les deux tests ; le
-- calendrier se DÉRIVE (src/lib/parcours.ts). Une séance faite s'écrit
-- comme un FAIT dans `intentions_entrainement`, avec `parcours_id` et
-- `parcours_rang`, à la fin de la séance et jamais avant.
--
-- ⚠️ LE CYCLE N'EST PAS TOUCHÉ. Les faits d'un programme ne portent
-- aucune étape : le curseur du cycle (Push, Pull…) ne bouge pas, et il
-- reprend à la même étape quand le programme se termine ou s'arrête.
--
-- ⚠️ UN SEUL PROGRAMME À LA FOIS, et c'est la base qui l'impose
-- (`uniq_parcours_en_cours`).
--
-- Les écritures passent par quatre fonctions ; la table ne s'écrit pas
-- depuis le navigateur. Le badge d'un programme terminé se pose dans
-- `profile_badges` (lu par `badges_aura`), sous le préfixe `programme-`,
-- qui ne peut pas rencontrer celui des affiches (`serie-`).
--
-- Rejouable. À coller dans l'éditeur SQL de Supabase.
-- ════════════════════════════════════════════════════════════════════

-- ── 1 · La table ─────────────────────────────────────────────────────
create table if not exists public.parcours (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  programme      text not null check (programme ~ '^[a-z0-9-]{2,40}$'),
  statut         text not null default 'en_cours' check (statut in ('en_cours', 'termine', 'arrete')),
  jours          smallint[] not null,
  debut          date not null,
  rang_debut     smallint not null default 1,
  creneaux       smallint not null check (creneaux between 3 and 80),
  test_depart    numeric(7, 2) check (test_depart between 0 and 99999),
  test_depart_le timestamptz,
  test_fin       numeric(7, 2) check (test_fin between 0 and 99999),
  test_fin_le    timestamptz,
  cree_le        timestamptz not null default now(),
  fini_le        timestamptz,
  constraint parcours_jours_valides check (cardinality(jours) between 1 and 7 and jours <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  constraint parcours_rang_debut check (rang_debut between 1 and creneaux),
  constraint parcours_test_depart check ((test_depart is null) = (test_depart_le is null)),
  constraint parcours_test_fin check ((test_fin is null) = (test_fin_le is null)),
  constraint parcours_fini check ((statut = 'en_cours') = (fini_le is null)),
  constraint parcours_termine check (statut <> 'termine' or (test_depart is not null and test_fin is not null))
);

create unique index if not exists uniq_parcours_en_cours on public.parcours (user_id) where statut = 'en_cours';
create index if not exists idx_parcours_user on public.parcours (user_id, cree_le desc);

alter table public.parcours enable row level security;
drop policy if exists "parcours lisibles par leur proprietaire" on public.parcours;
create policy "parcours lisibles par leur proprietaire" on public.parcours
  for select to authenticated using (auth.uid() = user_id);
revoke insert, update, delete on public.parcours from anon, authenticated;
grant select on public.parcours to authenticated;

-- ── 2 · Les faits d'un programme, dans le planning ───────────────────
-- ⚠️ `on delete set null` sur `parcours_id` seul, et AUCUNE contrainte
-- qui lie les deux colonnes : une contrainte « les deux ou aucune »
-- sauterait au milieu de la cascade (la leçon de V4b). Un parcours ne se
-- supprime de toute façon jamais, il s'arrête ; seule la suppression du
-- compte l'emporte, et ses intentions avec.
alter table public.intentions_entrainement
  add column if not exists parcours_id uuid references public.parcours(id) on delete set null;
alter table public.intentions_entrainement
  add column if not exists parcours_rang smallint check (parcours_rang between 1 and 80);

-- Un créneau du programme ne se referme qu'une fois.
create unique index if not exists uniq_parcours_creneau
  on public.intentions_entrainement (parcours_id, parcours_rang) where parcours_id is not null;

-- La garde : un fait de programme appartient au programme EN COURS de la
-- même personne, porte un créneau de séance (ni le premier ni le dernier,
-- ce sont les tests), et c'est une séance faite, sans étape du cycle.
create or replace function public.verifier_fait_parcours()
returns trigger language plpgsql set search_path = public as $$
declare
  p record;
begin
  if new.parcours_id is null then
    new.parcours_rang := null;
    return new;
  end if;
  if tg_op = 'UPDATE'
     and new.parcours_id is not distinct from old.parcours_id
     and new.parcours_rang is not distinct from old.parcours_rang then
    return new;
  end if;
  select user_id, statut, creneaux into p from public.parcours where id = new.parcours_id;
  if not found or p.user_id <> new.user_id then
    raise exception 'parcours_inconnu' using errcode = '23514';
  end if;
  if p.statut <> 'en_cours' then
    raise exception 'parcours_clos' using errcode = '23514';
  end if;
  if new.parcours_rang is null or new.parcours_rang < 2 or new.parcours_rang > p.creneaux - 1 then
    raise exception 'creneau_hors_parcours' using errcode = '23514';
  end if;
  if new.nature <> 'seance' or new.statut <> 'faite' or new.etape_consommee_id is not null then
    raise exception 'fait_parcours_invalide' using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists intentions_verifier_parcours on public.intentions_entrainement;
create trigger intentions_verifier_parcours
  before insert or update of parcours_id, parcours_rang on public.intentions_entrainement
  for each row execute function public.verifier_fait_parcours();

-- ── 3 · Commencer ────────────────────────────────────────────────────
-- Les jours se donnent de 1 (lundi) à 7 (dimanche), sans doublon. Le
-- départ est le jour où l'on commence (le premier créneau tombe sur le
-- premier jour choisi à partir de là) ; la marge d'un jour couvre l'écart
-- entre l'heure de Paris et celle du serveur.
create or replace function public.commencer_parcours(p_programme text, p_jours smallint[], p_debut date, p_creneaux smallint)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_jours smallint[];
  v_id uuid;
begin
  if v_user is null then
    raise exception 'sans_session' using errcode = '42501';
  end if;
  if p_programme is null or p_programme !~ '^[a-z0-9-]{2,40}$' then
    raise exception 'programme_invalide' using errcode = '22023';
  end if;
  select array_agg(distinct j order by j) into v_jours from unnest(p_jours) as j where j between 1 and 7;
  if v_jours is null or cardinality(v_jours) <> cardinality(p_jours) then
    raise exception 'jours_invalides' using errcode = '22023';
  end if;
  if p_debut is null or p_debut < current_date - 1 or p_debut > current_date + 14 then
    raise exception 'debut_invalide' using errcode = '22023';
  end if;
  if p_creneaux is null or p_creneaux not between 3 and 80 then
    raise exception 'creneaux_invalides' using errcode = '22023';
  end if;
  if exists (select 1 from public.parcours where user_id = v_user and statut = 'en_cours') then
    raise exception 'deja_en_cours' using errcode = '23505';
  end if;
  insert into public.parcours (user_id, programme, jours, debut, creneaux)
  values (v_user, p_programme, v_jours, p_debut, p_creneaux)
  returning id into v_id;
  return v_id;
end $$;

-- ── 4 · Changer ses jours ────────────────────────────────────────────
-- Les créneaux qui restent se reposent sur les nouveaux jours à partir de
-- `p_debut`, en commençant par le créneau `p_rang_debut` (le premier qui
-- reste). Ce qui est fait ne bouge pas.
create or replace function public.changer_jours_parcours(p_parcours uuid, p_jours smallint[], p_debut date, p_rang_debut smallint)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_jours smallint[];
  p record;
begin
  if v_user is null then
    raise exception 'sans_session' using errcode = '42501';
  end if;
  select * into p from public.parcours where id = p_parcours and user_id = v_user for update;
  if not found then
    raise exception 'parcours_inconnu' using errcode = '22023';
  end if;
  if p.statut <> 'en_cours' then
    raise exception 'parcours_clos' using errcode = '22023';
  end if;
  select array_agg(distinct j order by j) into v_jours from unnest(p_jours) as j where j between 1 and 7;
  if v_jours is null or cardinality(v_jours) <> cardinality(p_jours) then
    raise exception 'jours_invalides' using errcode = '22023';
  end if;
  if p_debut is null or p_debut < current_date - 1 or p_debut > current_date + 14 then
    raise exception 'debut_invalide' using errcode = '22023';
  end if;
  if p_rang_debut is null or p_rang_debut not between 1 and p.creneaux then
    raise exception 'rang_invalide' using errcode = '22023';
  end if;
  update public.parcours set jours = v_jours, debut = p_debut, rang_debut = p_rang_debut where id = p.id;
end $$;

-- ── 5 · Arrêter ──────────────────────────────────────────────────────
-- Les séances faites restent dans le planning et dans le journal. Rend
-- `false` si le programme n'était plus en cours.
create or replace function public.arreter_parcours(p_parcours uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'sans_session' using errcode = '42501';
  end if;
  update public.parcours set statut = 'arrete', fini_le = now()
   where id = p_parcours and user_id = auth.uid() and statut = 'en_cours';
  return found;
end $$;

-- ── 6 · Noter un test ────────────────────────────────────────────────
-- 'depart' : le premier créneau. 'fin' : le dernier, seulement quand toutes
-- les séances du programme sont faites ; il termine le programme et pose
-- son badge. Un test déjà noté ne se réécrit pas (`deja`).
create or replace function public.noter_test_parcours(p_parcours uuid, p_moment text, p_valeur numeric)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  p record;
  v_faits integer;
begin
  if v_user is null then
    raise exception 'sans_session' using errcode = '42501';
  end if;
  if p_valeur is null or p_valeur < 0 or p_valeur > 99999 then
    raise exception 'valeur_invalide' using errcode = '22023';
  end if;
  select * into p from public.parcours where id = p_parcours and user_id = v_user for update;
  if not found then
    raise exception 'parcours_inconnu' using errcode = '22023';
  end if;
  if p_moment = 'depart' then
    if p.test_depart is not null then
      return 'deja';
    end if;
    if p.statut <> 'en_cours' then
      raise exception 'parcours_clos' using errcode = '22023';
    end if;
    update public.parcours set test_depart = round(p_valeur, 2), test_depart_le = now() where id = p.id;
    return 'note';
  elsif p_moment = 'fin' then
    if p.test_fin is not null then
      return 'deja';
    end if;
    if p.statut <> 'en_cours' then
      raise exception 'parcours_clos' using errcode = '22023';
    end if;
    if p.test_depart is null then
      raise exception 'test_depart_manquant' using errcode = '22023';
    end if;
    select count(distinct parcours_rang) into v_faits
      from public.intentions_entrainement
     where parcours_id = p.id and user_id = v_user and statut = 'faite';
    if v_faits < p.creneaux - 2 then
      raise exception 'seances_manquantes' using errcode = '22023';
    end if;
    update public.parcours
       set test_fin = round(p_valeur, 2), test_fin_le = now(), statut = 'termine', fini_le = now()
     where id = p.id;
    insert into public.profile_badges (user_id, badge_slug)
    values (v_user, 'programme-' || p.programme)
    on conflict (user_id, badge_slug) do nothing;
    return 'termine';
  end if;
  raise exception 'moment_invalide' using errcode = '22023';
end $$;

-- ── 7 · Les droits ───────────────────────────────────────────────────
revoke all on function public.commencer_parcours(text, smallint[], date, smallint) from public, anon;
revoke all on function public.changer_jours_parcours(uuid, smallint[], date, smallint) from public, anon;
revoke all on function public.arreter_parcours(uuid) from public, anon;
revoke all on function public.noter_test_parcours(uuid, text, numeric) from public, anon;
grant execute on function public.commencer_parcours(text, smallint[], date, smallint) to authenticated;
grant execute on function public.changer_jours_parcours(uuid, smallint[], date, smallint) to authenticated;
grant execute on function public.arreter_parcours(uuid) to authenticated;
grant execute on function public.noter_test_parcours(uuid, text, numeric) to authenticated;
