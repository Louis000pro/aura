-- Journal privé des envois push. Aucun contenu de message, endpoint ou clé d'appareil.
begin;
create table if not exists public.journal_push (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  cree_le timestamptz not null default now(),
  termine_le timestamptz,
  touche_le timestamptz,
  titre text not null,
  categorie text not null,
  statut text not null default 'preparation' check (statut in ('preparation','accepte','partiel','echec','sans_appareil')),
  appareils int not null default 0,
  acceptes int not null default 0,
  echecs int not null default 0,
  codes_erreur int[] not null default '{}',
  token_hash text not null
);
create index if not exists journal_push_chronologie on public.journal_push(cree_le desc, id);
create index if not exists journal_push_membre on public.journal_push(user_id, cree_le desc);
alter table public.journal_push enable row level security;
revoke all on public.journal_push from public, anon, authenticated;
grant select, insert, update, delete on public.journal_push to service_role;
commit;
