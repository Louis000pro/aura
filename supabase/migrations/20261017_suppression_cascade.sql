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
 where not exists (select 1 from auth.users u where u.id = w.user_id);
delete from public.notifications n
 where not exists (select 1 from auth.users u where u.id = n.user_id)
    or (n.from_user_id is not null
        and not exists (select 1 from auth.users u where u.id = n.from_user_id));

-- 2. Les clés.
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
