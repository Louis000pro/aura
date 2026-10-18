-- ─────────────────────────────────────────────────────────────────────────
-- Les événements du fil des potes (Louis, 2026-10-18, maquette
-- « Le fil des événements », validée : « c'est carré on fait ça »).
--
-- Le fil raconte ce qui arrive à tes AMIS (amitié réciproque) : une séance
-- faite, un nouveau rang, une nouvelle flamme, un badge gagné. Seulement de
-- bonnes nouvelles : jamais une absence, jamais une série cassée, aucun
-- classement. On y répond d'un « Bravo ».
--
-- La séance s'écrit par la BASE (trigger sur `workout_sessions`), donc elle
-- ne dépend d'aucun écran ; la personne peut la couper (métadonnée Auth
-- `fil_seances = 'non'`). Rang, flamme et badge s'écrivent depuis l'app, au
-- moment où elle les fête déjà. Une clé par événement rend tout rejouable.
--
-- Indépendant de `20261018_fil_des_potes.sql` : `sont_amis` est redéfinie
-- ici à l'identique. Rejouable.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.sont_amis(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select a is not null and b is not null
     and exists (select 1 from followers where follower_id = a and following_id = b)
     and exists (select 1 from followers where follower_id = b and following_id = a);
$$;
revoke all on function public.sont_amis(uuid, uuid) from public, anon;
grant execute on function public.sont_amis(uuid, uuid) to authenticated;

-- 1. Les événements.
create table if not exists public.evenements_fil (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  sorte     text not null check (sorte in ('seance', 'rang', 'flamme', 'badge')),
  cle       text not null check (char_length(cle) <= 80),
  data      jsonb not null default '{}'::jsonb check (octet_length(data::text) <= 600),
  -- Une séance supprimée de l'historique emporte son événement.
  seance_id uuid references public.workout_sessions(id) on delete cascade,
  cree_le   timestamptz not null default now(),
  unique (user_id, cle)
);
create index if not exists evenements_fil_user_idx on public.evenements_fil (user_id, cree_le desc);
alter table public.evenements_fil enable row level security;

drop policy if exists "evenements visibles par moi et mes amis" on public.evenements_fil;
create policy "evenements visibles par moi et mes amis" on public.evenements_fil
  for select to authenticated
  using (user_id = auth.uid() or public.sont_amis(auth.uid(), user_id));

-- L'app n'écrit que ses propres rangs, flammes et badges. Une séance ne
-- s'écrit que par le trigger : on ne s'invente pas une séance.
drop policy if exists "publier mes evenements" on public.evenements_fil;
create policy "publier mes evenements" on public.evenements_fil
  for insert to authenticated
  with check (user_id = auth.uid() and sorte in ('rang', 'flamme', 'badge') and seance_id is null);

drop policy if exists "retirer mes evenements" on public.evenements_fil;
create policy "retirer mes evenements" on public.evenements_fil
  for delete to authenticated using (user_id = auth.uid());

-- 2. La séance faite, écrite par la base. Cinq minutes au moins, et pas si
--    la personne a coupé « Montrer mes séances à mes potes ».
create or replace function public.evenement_seance_fil()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if coalesce(new.duration_minutes, 0) < 5 then return new; end if;
  if exists (
    select 1 from auth.users u
    where u.id = new.user_id and u.raw_user_meta_data->>'fil_seances' = 'non'
  ) then return new; end if;
  insert into public.evenements_fil (user_id, sorte, cle, data, seance_id, cree_le)
  values (
    new.user_id, 'seance', 'seance:' || new.id::text,
    jsonb_build_object('titre', left(coalesce(new.title, 'Séance'), 80), 'minutes', new.duration_minutes),
    new.id, coalesce(new.termine_le, now())
  )
  on conflict (user_id, cle) do nothing;
  return new;
exception when others then
  -- Un événement ne doit jamais empêcher une séance de s'enregistrer.
  return new;
end;
$$;
revoke all on function public.evenement_seance_fil() from public, anon, authenticated;

drop trigger if exists evenement_seance_fil on public.workout_sessions;
create trigger evenement_seance_fil
  after insert on public.workout_sessions
  for each row execute function public.evenement_seance_fil();

-- 3. Les « Bravo ». Un par personne et par événement, jamais sur le sien.
create table if not exists public.bravos_evenement (
  evenement_id uuid not null references public.evenements_fil(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (evenement_id, user_id)
);
alter table public.bravos_evenement enable row level security;

drop policy if exists "bravos visibles avec l'evenement" on public.bravos_evenement;
create policy "bravos visibles avec l'evenement" on public.bravos_evenement
  for select to authenticated
  using (exists (select 1 from public.evenements_fil e where e.id = evenement_id));

drop policy if exists "dire bravo" on public.bravos_evenement;
create policy "dire bravo" on public.bravos_evenement
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.evenements_fil e where e.id = evenement_id and e.user_id <> auth.uid())
  );

drop policy if exists "retirer son bravo" on public.bravos_evenement;
create policy "retirer son bravo" on public.bravos_evenement
  for delete to authenticated using (user_id = auth.uid());
