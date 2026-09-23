-- ════════════════════════════════════════════════════════════════════
-- avis — les avis PUBLICS sur Vaiiya (note produit + commentaire).
--
-- Choix de Louis (2026-09-23) : les avis se voient dans l'app, pas un
-- retour privé. UN avis par personne (éditable), lisible par tout le
-- monde, écrit/modifié/supprimé uniquement par son auteur.
--
-- Ce n'est PAS un fil social : pas de réponse, pas de like, aucune
-- activité d'autrui rapatriée. Juste le témoignage de chacun sur le produit.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.avis (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  note       smallint not null check (note between 1 and 5),
  texte      text not null default '' check (char_length(texte) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_avis_created on public.avis (created_at desc);

alter table public.avis enable row level security;

-- Lecture publique : un avis public se lit du dehors, sinon il ne sert à rien.
drop policy if exists "avis lisibles par tous" on public.avis;
create policy "avis lisibles par tous" on public.avis
  for select using (true);

-- Chacun n'écrit, ne modifie et ne supprime QUE le sien.
drop policy if exists "avis insert par soi" on public.avis;
create policy "avis insert par soi" on public.avis
  for insert with check (auth.uid() = user_id);

drop policy if exists "avis update par soi" on public.avis;
create policy "avis update par soi" on public.avis
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "avis delete par soi" on public.avis;
create policy "avis delete par soi" on public.avis
  for delete using (auth.uid() = user_id);
