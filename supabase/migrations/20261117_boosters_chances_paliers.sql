-- Chances cumulées, version 2 (Louis, 2026-11-17) : environ un booster sur trois a presque
-- sûrement une épique ou mieux, et la chromatique monte à peine.
-- 0 rare d'affilée : 60 / 30 / 9 / 1. 1 rare : 35 / 52 / 11,5 / 1,5. 2 rares ou plus : 8 / 75,8 / 14,2 / 2.
-- Ce que la rare perd va à 88 % à l'épique, 10 % à la légendaire, 2 % à la chromatique. Rejouable.
create or replace function public.chances_booster(p_user uuid)
returns jsonb language sql stable set search_path = '' as $$
  with n as (select public.rares_affilee_booster(p_user) as affilee),
  s as (select affilee, case when affilee = 0 then 0 when affilee = 1 then 25 else 52 end::numeric as extra from n)
  select jsonb_build_object('rare', 60 - extra, 'epique', 30 + extra * .88,
    'legendaire', 9 + extra * .10, 'chromatique', 1 + extra * .02, 'affilee', affilee) from s
$$;
revoke all on function public.chances_booster(uuid) from public, anon, authenticated;
