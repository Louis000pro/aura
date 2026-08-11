-- ════════════════════════════════════════════════════════════════════
-- REGISTRE IA AU LONG COURS — pour l'écran d'administration
--
-- Pourquoi : `ai_usage` fait son travail (compter et refuser), mais il
-- oublie. Ses lignes sont effacées deux jours après leur expiration par le
-- ménage opportuniste de `consommer_ia`. Impossible, donc, de répondre à
-- « est-ce que la consommation d'IA monte ce mois-ci ? », qui est la seule
-- dépense variable de Vaiiya.
--
-- Ce que ce fichier ajoute : un total par jour et par catégorie. Deux
-- entiers par ligne, aucune donnée personnelle, jamais de contenu de
-- message. Une trentaine de lignes par mois.
--
-- ⚠️ À COLLER À LA MAIN dans le SQL Editor Supabase, APRÈS
--    20260729_garde_fou_ia.sql (il remplace sa fonction `consommer_ia`).
--
-- Tant qu'il n'est pas collé, rien ne casse : l'écran d'administration
-- affiche aujourd'hui et hier (lus dans `ai_usage`, encore présents) et
-- laisse la courbe de l'historique vide.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.ai_usage_daily (
  jour       date    not null,
  categorie  text    not null,
  -- Tous les appels, y compris ceux d'un admin : c'est la facture, pas un quota.
  appels     integer not null default 0,
  -- Comptes distincts ayant appelé ce jour-là. Un admin n'a pas de compteur
  -- journalier (il n'est pas plafonné à la journée), donc il n'est pas compté ici.
  comptes    integer not null default 0,
  primary key (jour, categorie)
);

create index if not exists ai_usage_daily_jour_idx on public.ai_usage_daily (jour desc);

-- Aucun accès client, exactement comme `ai_usage` : RLS active sans aucune
-- policy. Seul le serveur (service_role) écrit et lit.
alter table public.ai_usage_daily enable row level security;

-- ── `consommer_ia`, augmentée du registre ────────────────────────────
-- Le comportement du compteur ne change pas d'une virgule : on incrémente
-- d'abord, l'appelant compare ensuite. Le registre est écrit après, dans un
-- bloc qui avale ses propres erreurs — une statistique ne doit JAMAIS
-- pouvoir faire échouer un appel au coach.
--
-- Les deux formes de clé portent chacune leur information :
--   `chat:m:2026-08-11T14:32` → une par appel, pour tout le monde   → appels
--   `chat:2026-08-11`         → une par compte et par jour          → comptes
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
  v_cat      text := split_part(p_cle, ':', 1);
  v_jour     date := (now() at time zone 'Europe/Paris')::date;
begin
  insert into public.ai_usage (user_id, cle, compteur, expire_at)
  values (p_user, p_cle, 1, p_expire)
  on conflict (user_id, cle) do update
    set compteur = ai_usage.compteur + 1
  returning compteur into v_compteur;

  begin
    if split_part(p_cle, ':', 2) = 'm' then
      insert into public.ai_usage_daily (jour, categorie, appels, comptes)
      values (v_jour, v_cat, 1, 0)
      on conflict (jour, categorie) do update
        set appels = ai_usage_daily.appels + 1;
    elsif v_compteur = 1 then
      -- Premier appel du jour de ce compte dans cette catégorie.
      insert into public.ai_usage_daily (jour, categorie, appels, comptes)
      values (v_jour, v_cat, 0, 1)
      on conflict (jour, categorie) do update
        set comptes = ai_usage_daily.comptes + 1;
    end if;
  exception when others then
    null; -- le registre est un confort, le compteur est la protection
  end;

  -- Ménage opportuniste : évite un cron pour si peu.
  if random() < 0.02 then
    delete from public.ai_usage where expire_at < now() - interval '2 days';
  end if;

  return v_compteur;
end;
$$;

-- Mêmes droits qu'avant : le client ne doit jamais pouvoir appeler ça, il
-- pourrait brûler le quota d'un autre compte ou ne pas appeler du tout.
revoke all on function public.consommer_ia(uuid, text, timestamptz) from public;
revoke all on function public.consommer_ia(uuid, text, timestamptz) from anon;
revoke all on function public.consommer_ia(uuid, text, timestamptz) from authenticated;
grant execute on function public.consommer_ia(uuid, text, timestamptz) to service_role;
