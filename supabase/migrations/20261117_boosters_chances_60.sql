-- Meilleure carte (Louis, 2026-11-17) : 60 % rare, 30 % épique, 8 % légendaire, 2 % chromatique. Jamais de commune. Rejouable.
create or replace function public.raretes_booster_exercices(p_ticket integer)
returns text[]
language sql immutable strict
set search_path = ''
as $$
  select case
    when p_ticket < 45 then array['commune', 'commune', 'rare']
    when p_ticket < 60 then array['commune', 'rare', 'rare']
    when p_ticket < 90 then array['commune', 'rare', 'epique']
    when p_ticket < 98 then array['commune', 'rare', 'legendaire']
    else array['commune', 'rare', 'chromatique']
  end
$$;
revoke all on function public.raretes_booster_exercices(integer) from public, anon, authenticated;
