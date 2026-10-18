-- ─────────────────────────────────────────────────────────────────────────
-- Le fil des potes (Louis, 2026-10-18, maquette « Progresser avec ses potes »)
--
-- Une affiche de séance peut être montrée à ses AMIS (amitié réciproque,
-- jamais une demande à sens unique), et les amis y réagissent : « Feu »,
-- « Costaud », « Je fais pareil ». Aucun commentaire public : une réponse
-- passe en message privé. Rejouable.
-- ─────────────────────────────────────────────────────────────────────────

-- 1. L'amitié réciproque, en une fonction. Elle lit `followers` dans les
--    deux sens ; SECURITY DEFINER pour qu'une policy puisse l'appeler sans
--    dépendre des droits de lecture de la table.
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

-- 2. Les posts « amis » : réservés aux amis RÉCIPROQUES. Avant, il suffisait
--    de suivre quelqu'un (une demande encore en attente) pour lire ses
--    affiches.
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select using (
  audience = 'public'
  or user_id = auth.uid()
  or (audience = 'friends' and public.sont_amis(auth.uid(), user_id))
);

-- 3. Les réactions à une affiche. Une ligne par personne et par sorte.
create table if not exists public.reactions_affiche (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  sorte      text not null check (sorte in ('feu', 'costaud', 'pareil')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, sorte)
);
create index if not exists reactions_affiche_post_idx on public.reactions_affiche (post_id);
alter table public.reactions_affiche enable row level security;

-- On voit les réactions d'une affiche qu'on a le droit de voir (la
-- sous-requête passe par la policy de `posts`).
drop policy if exists "reactions visibles avec l'affiche" on public.reactions_affiche;
create policy "reactions visibles avec l'affiche" on public.reactions_affiche
  for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));

-- On ne réagit qu'en son nom, à l'affiche de quelqu'un d'autre qu'on voit.
drop policy if exists "reagir a une affiche" on public.reactions_affiche;
create policy "reagir a une affiche" on public.reactions_affiche
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.posts p where p.id = post_id and p.user_id <> auth.uid())
  );

drop policy if exists "retirer sa reaction" on public.reactions_affiche;
create policy "retirer sa reaction" on public.reactions_affiche
  for delete to authenticated using (user_id = auth.uid());

-- 4. Qui s'est entraîné aujourd'hui (jour parisien), parmi moi et mes amis.
--    `workout_sessions` est en RLS propriétaire : on ne rend qu'un booléen
--    par ami, aucune donnée d'entraînement.
create or replace function public.presence_amis()
returns table (user_id uuid, seance_aujourdhui boolean)
language sql stable security definer set search_path = public
as $$
  with amis as (
    select auth.uid() as id where auth.uid() is not null
    union
    select f.following_id
    from followers f
    where f.follower_id = auth.uid()
      and exists (select 1 from followers g
                  where g.follower_id = f.following_id and g.following_id = auth.uid())
  )
  select a.id,
         exists (
           select 1 from workout_sessions w
           where w.user_id = a.id
             and (w.started_at at time zone 'Europe/Paris')::date
               = (now() at time zone 'Europe/Paris')::date
         )
  from amis a;
$$;
revoke all on function public.presence_amis() from public, anon;
grant execute on function public.presence_amis() to authenticated;
