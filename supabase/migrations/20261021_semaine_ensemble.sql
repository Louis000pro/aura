-- ─────────────────────────────────────────────────────────────
-- La semaine ensemble (Louis, 2026-10-21, maquette « La semaine
-- ensemble » validée).
--
-- Un objectif commun pour la bande (moi + mes amis RÉCIPROQUES) :
-- trois séances par membre, du lundi au dimanche, heure de Paris.
-- `workout_sessions` est en RLS propriétaire, d'où cette fonction
-- SECURITY DEFINER. Elle ne rend que ce que l'écran montre :
--   · le total de séances de la bande (jamais par personne) ;
--   · pour chacun, a-t-il déjà bougé cette semaine (oui / non) ;
--   · les jours où quelqu'un a bougé.
-- Aucun compte par personne ne sort : on ne compare personne.
-- Séance comptée = 5 minutes au moins, comme les missions. Rejouable.
-- ─────────────────────────────────────────────────────────────

create or replace function public.semaine_ensemble()
returns jsonb
language sql stable security definer set search_path = public
as $$
  with bornes as (
    select date_trunc('week', (now() at time zone 'Europe/Paris'))::date as debut
  ),
  bande as (
    select auth.uid() as id where auth.uid() is not null
    union
    select f.following_id
    from followers f
    where f.follower_id = auth.uid()
      and exists (select 1 from followers g
                  where g.follower_id = f.following_id and g.following_id = auth.uid())
  ),
  seances as (
    select w.user_id, (w.started_at at time zone 'Europe/Paris')::date as jour
    from workout_sessions w, bornes b
    where w.user_id in (select id from bande)
      and coalesce(w.duration_minutes, 0) >= 5
      and (w.started_at at time zone 'Europe/Paris')::date between b.debut and b.debut + 6
  )
  select case when auth.uid() is null then null else jsonb_build_object(
    'debut', (select debut from bornes),
    'seances', (select count(*) from seances),
    'membres', coalesce((select jsonb_agg(jsonb_build_object(
        'user_id', b.id,
        'a_bouge', exists (select 1 from seances s where s.user_id = b.id)))
      from bande b), '[]'::jsonb),
    'jours', coalesce((select jsonb_agg(distinct s.jour) from seances s), '[]'::jsonb)
  ) end;
$$;

revoke all on function public.semaine_ensemble() from public, anon;
grant execute on function public.semaine_ensemble() to authenticated;
