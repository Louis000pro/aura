-- Prévenir quand le booster revient : pg_cron appelle /api/cron/boosters toutes les 15 min.
-- La clé (BOOSTER_CRON_KEY, la même que sur Vercel) vit dans Vault sous le nom
-- 'booster_cron_key' ; elle n'est pas écrite ici. Pour la poser :
--   select vault.create_secret('<clé>', 'booster_cron_key');
create extension if not exists pg_net;
create extension if not exists pg_cron;

create table if not exists public.boosters_notifies (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dernier_envoi timestamptz not null
);
alter table public.boosters_notifies enable row level security; -- service_role seulement

select cron.unschedule('boosters-prets') where exists (select 1 from cron.job where jobname = 'boosters-prets');
select cron.schedule('boosters-prets', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://vaiiya.fr/api/cron/boosters',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key',
      (select decrypted_secret from vault.decrypted_secrets where name = 'booster_cron_key')),
    body := '{}'::jsonb
  );
$$);
