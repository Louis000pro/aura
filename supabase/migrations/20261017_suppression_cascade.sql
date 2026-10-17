-- ═══════════════════════════════════════════════════════════════════════
-- Audit du 2026-10-17 · lot 3 : ce qu'un compte supprimé laissait derrière lui
--
-- `weight_logs` (des pesées, donc des données de santé) et `notifications`
-- n'avaient aucune clé étrangère : supprimer un compte les laissait en base.
-- La route de suppression les efface désormais elle-même
-- (src/lib/suppressionCompte.ts) ; ces clés en sont la ceinture.
--
-- ⚠️ Étape 1 SUPPRIME les lignes orphelines déjà présentes (4 pesées et
-- 6 notifications de comptes supprimés au 2026-10-17). Elles n'appartiennent
-- plus à personne : c'est précisément ce que la loi demande d'effacer.
-- Rejouable.
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Les orphelins.
delete from public.weight_logs w
 where not exists (select 1 from auth.users u where u.id::text = w.user_id::text);
delete from public.notifications n
 where not exists (select 1 from auth.users u where u.id = n.user_id)
    or (n.from_user_id is not null
        and not exists (select 1 from auth.users u where u.id = n.from_user_id));

-- 2. Les clés.
-- ⚠️ `weight_logs.user_id` était un TEXT : une clé étrangère vers
-- auth.users(id) exige un uuid. On la convertit (toutes les valeurs ont la
-- forme d'un uuid, vérifié le 2026-10-17). La policy porte sur la colonne,
-- donc elle part le temps de la conversion et revient, sans le ::text.
drop policy if exists "own weight logs" on public.weight_logs;
alter table public.weight_logs alter column user_id type uuid using user_id::uuid;
create policy "own weight logs" on public.weight_logs
  for all using (auth.uid() = user_id);

alter table public.weight_logs drop constraint if exists weight_logs_user_fkey;
alter table public.weight_logs
  add constraint weight_logs_user_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.notifications drop constraint if exists notifications_user_fkey;
alter table public.notifications
  add constraint notifications_user_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.notifications drop constraint if exists notifications_from_user_fkey;
alter table public.notifications
  add constraint notifications_from_user_fkey
  foreign key (from_user_id) references auth.users(id) on delete cascade;
