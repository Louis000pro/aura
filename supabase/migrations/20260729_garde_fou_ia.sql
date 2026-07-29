-- ════════════════════════════════════════════════════════════════════
-- GARDE-FOU IA — compteurs d'usage par compte
--
-- Pourquoi : toutes les fonctions d'IA (coach, scan photo, estimation,
-- recettes, génération de séance, dictée) coûtent de l'argent à chaque appel.
-- Sans compteur, un seul script peut vider le budget en une nuit, et un
-- usage « illimité » vendu 5,99 € peut coûter plus cher qu'il ne rapporte.
--
-- Principe : une ligne par (compte, clé de période). La clé porte la période
-- (ex. `chat:2026-07-29` ou `chat:m:2026-07-29T14:32`), donc une nouvelle
-- période crée naturellement une nouvelle ligne repartant de 1. `expire_at`
-- ne sert qu'au ménage.
--
-- ⚠️ À COLLER À LA MAIN dans le SQL Editor Supabase.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.ai_usage (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  cle        text        not null,
  compteur   integer     not null default 0,
  expire_at  timestamptz not null,
  primary key (user_id, cle)
);

create index if not exists ai_usage_expire_idx on public.ai_usage (expire_at);

-- Aucun accès client : seul le serveur (service_role) écrit et lit ces
-- compteurs. RLS active sans aucune policy = personne d'autre ne passe.
alter table public.ai_usage enable row level security;

-- ── Incrémente et renvoie le compteur de la période ──────────────────
-- Atomique : deux requêtes simultanées ne peuvent pas passer toutes les deux
-- sous la limite. On incrémente d'abord, l'appelant compare ensuite.
create or replace function public.consommer_ia(
  p_user   uuid,
  p_cle    text,
  p_expire timestamptz
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_compteur integer;
begin
  insert into public.ai_usage (user_id, cle, compteur, expire_at)
  values (p_user, p_cle, 1, p_expire)
  on conflict (user_id, cle) do update
    set compteur = ai_usage.compteur + 1
  returning compteur into v_compteur;

  -- Ménage opportuniste : évite un cron pour si peu.
  if random() < 0.02 then
    delete from public.ai_usage where expire_at < now() - interval '2 days';
  end if;

  return v_compteur;
end;
$$;

-- Le client ne doit jamais pouvoir appeler ça : il pourrait brûler le quota
-- d'un autre compte, ou ne pas appeler la fonction du tout.
revoke all on function public.consommer_ia(uuid, text, timestamptz) from public;
revoke all on function public.consommer_ia(uuid, text, timestamptz) from anon;
revoke all on function public.consommer_ia(uuid, text, timestamptz) from authenticated;
grant execute on function public.consommer_ia(uuid, text, timestamptz) to service_role;

-- ── Pour Louis : qui consomme quoi aujourd'hui ───────────────────────
-- select p.pseudo, u.cle, u.compteur
-- from ai_usage u join profiles p on p.id = u.user_id
-- where u.cle like '%' || to_char(now() at time zone 'Europe/Paris', 'YYYY-MM-DD')
-- order by u.compteur desc limit 50;
