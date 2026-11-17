-- La troisième carte d'un booster n'est plus jamais une commune (Louis, 2026-11-17 : « trois communes,
-- ça dégoûte les gens »). La meilleure carte : 55 % rare, 30 % épique, 13 % légendaire, 2 % chromatique.
-- Les deux premières restent une commune et une commune ou une rare. Rejouable.
create or replace function public.raretes_booster_exercices(p_ticket integer)
returns text[]
language sql immutable strict
set search_path = ''
as $$
  select case
    when p_ticket < 45 then array['commune', 'commune', 'rare']
    when p_ticket < 55 then array['commune', 'rare', 'rare']
    when p_ticket < 85 then array['commune', 'rare', 'epique']
    when p_ticket < 98 then array['commune', 'rare', 'legendaire']
    else array['commune', 'rare', 'chromatique']
  end
$$;
revoke all on function public.raretes_booster_exercices(integer) from public, anon, authenticated;
