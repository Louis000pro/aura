-- ════════════════════════════════════════════════════════════════════
-- Opt-in WhatsApp — rappels & motivation (facultatif, collecté à l'onboarding).
--
-- Le numéro de téléphone est une donnée SENSIBLE : il ne vit PAS dans
-- `profiles` (table lisible par d'autres utilisateurs pour la recherche
-- d'amis), sinon il fuiterait. Table séparée, RLS owner-only : seul le
-- propriétaire lit/écrit sa ligne. L'envoi (Phase 2) se fera côté serveur
-- avec la clé service-role, qui contourne la RLS.
--
-- `whatsapp_optin_at` = horodatage qui fait PREUVE d'opt-in (exigé par le
-- RGPD et par les règles de WhatsApp Business avant tout message).
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.user_contacts (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  phone              text,
  whatsapp_optin     boolean not null default false,
  whatsapp_optin_at  timestamptz,
  updated_at         timestamptz not null default now()
);

alter table public.user_contacts enable row level security;

-- Chacun ne voit et ne modifie QUE sa propre ligne.
drop policy if exists "user_contacts_select_own" on public.user_contacts;
create policy "user_contacts_select_own" on public.user_contacts
  for select using (auth.uid() = user_id);

drop policy if exists "user_contacts_insert_own" on public.user_contacts;
create policy "user_contacts_insert_own" on public.user_contacts
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_contacts_update_own" on public.user_contacts;
create policy "user_contacts_update_own" on public.user_contacts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
