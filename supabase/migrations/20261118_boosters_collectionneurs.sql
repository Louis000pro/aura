-- Les collectionneurs (Louis, 2026-11-18) : le classement des cartes d'exercices et « Qui l'a ».
-- Les tables des boosters restent lisibles par leur seul propriétaire. Ces fonctions ne rendent
-- que des comptes, des pseudos et des avatars, jamais les dates ni le détail des ouvertures.
-- Les ouvertures d'essai (boosters_illimites sans cadence_3h, réservées aux comptes d'essai)
-- ne comptent pas : le classement ne compte que les boosters gagnés.
-- Points par carte différente : commune 1, rare 2, épique 5, légendaire 10, chromatique 25.
-- Les doublons ne comptent pas.

create or replace function public.cartes_detenues_boosters()
returns table(user_id uuid, exercice text, rarete text, n int, premier timestamptz)
language sql stable security definer set search_path = public as $$
  select b.user_id, c->>'exercice', c->>'rarete', count(*)::int, min(b.le)
  from (
    select user_id, cartes, jour::timestamptz as le from boosters_exercices
    union all
    select user_id, cartes, ouvert_le from boosters_illimites where cadence_3h
  ) b
  cross join lateral jsonb_array_elements(case when jsonb_typeof(b.cartes) = 'array' then b.cartes else '[]'::jsonb end) c
  where c->>'rarete' in ('commune', 'rare', 'epique', 'legendaire', 'chromatique')
    and coalesce(c->>'exercice', '') <> ''
  group by 1, 2, 3
$$;
revoke all on function public.cartes_detenues_boosters() from public, anon, authenticated;

create or replace function public.classement_collection(p_portee text default 'amis')
returns table(user_id uuid, pseudo text, avatar_url text, points int, cartes int,
  commune int, rare int, epique int, legendaire int, chromatique int, rang int, moi boolean)
language sql stable security definer set search_path = public as $$
  with d as (select * from cartes_detenues_boosters()),
  s as (
    select d.user_id,
      sum(case d.rarete when 'commune' then 1 when 'rare' then 2 when 'epique' then 5
        when 'legendaire' then 10 else 25 end)::int as points,
      count(*)::int as cartes,
      count(*) filter (where d.rarete = 'commune')::int as commune,
      count(*) filter (where d.rarete = 'rare')::int as rare,
      count(*) filter (where d.rarete = 'epique')::int as epique,
      count(*) filter (where d.rarete = 'legendaire')::int as legendaire,
      count(*) filter (where d.rarete = 'chromatique')::int as chromatique
    from d group by d.user_id
  ),
  p as (
    select s.*, pr.pseudo, pr.avatar_url
    from s join profiles pr on pr.id = s.user_id
    where auth.uid() is not null
      and not coalesce(pr.is_banned, false)
      and (p_portee = 'tous' or s.user_id = auth.uid() or sont_amis(auth.uid(), s.user_id))
  ),
  r as (select p.*, rank() over (order by p.points desc, p.cartes desc)::int as rang from p)
  select r.user_id, r.pseudo, r.avatar_url, r.points, r.cartes, r.commune, r.rare, r.epique,
    r.legendaire, r.chromatique, r.rang, r.user_id = auth.uid()
  from r
  where r.rang <= 10 or r.user_id = auth.uid()
  order by r.rang, r.pseudo
$$;
revoke all on function public.classement_collection(text) from public, anon;
grant execute on function public.classement_collection(text) to authenticated;

create or replace function public.detenteurs_carte(p_exercice text, p_rarete text)
returns jsonb
language sql stable security definer set search_path = public as $$
  with d as (
    select d.* from cartes_detenues_boosters() d
    join profiles pr on pr.id = d.user_id
    where d.exercice = p_exercice and d.rarete = p_rarete and not coalesce(pr.is_banned, false)
  ),
  premier as (select d.user_id, d.premier from d order by d.premier limit 1)
  select case when auth.uid() is null then null else jsonb_build_object(
    'total', (select count(*) from d),
    'membres', (select count(*) from profiles where not coalesce(is_banned, false)),
    'moi', coalesce((select n from d where d.user_id = auth.uid()), 0),
    'amis', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', d.user_id, 'pseudo', pr.pseudo,
        'avatar_url', pr.avatar_url, 'n', d.n) order by d.premier)
      from d join profiles pr on pr.id = d.user_id
      where d.user_id <> auth.uid() and sont_amis(auth.uid(), d.user_id)), '[]'::jsonb),
    'premier_le', (select premier from premier),
    'premier_pseudo', (
      select pr.pseudo from premier pm join profiles pr on pr.id = pm.user_id
      where pm.user_id = auth.uid() or sont_amis(auth.uid(), pm.user_id))
  ) end
$$;
revoke all on function public.detenteurs_carte(text, text) from public, anon;
grant execute on function public.detenteurs_carte(text, text) to authenticated;
