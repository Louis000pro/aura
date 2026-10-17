-- Audit du 2026-10-17 · la dernière présence de chaque compte, lue par la
-- purge mensuelle des comptes inactifs (/api/cron/inactifs). Réservée au
-- service : elle ne sert qu'au serveur. Rejouable.
create or replace function public.derniere_presence_par_compte()
returns table (user_id uuid, jour date)
language sql
stable
security definer
set search_path = public
as $$
  select d.user_id, max(d.date)::date from public.daily_stats d group by d.user_id;
$$;

revoke execute on function public.derniere_presence_par_compte() from public, anon, authenticated;
grant execute on function public.derniere_presence_par_compte() to service_role;
