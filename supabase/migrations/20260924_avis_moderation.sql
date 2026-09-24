-- ════════════════════════════════════════════════════════════════════
-- avis — modération, pour rendre les avis PUBLICS et indexables.
--
-- Les avis deviennent visibles hors connexion (page d'accueil + /avis), donc
-- ils entrent dans le SEO et la preuve sociale. Un avis public non modéré est
-- une porte ouverte au spam et aux faux avis : chaque avis passe donc par un
-- statut, et seul un avis « approuve » se lit du dehors.
--
-- Trois barrières, pas une :
--   1. une colonne `statut` avec vocabulaire fermé ;
--   2. la RLS de lecture : public = approuvés, chacun voit le sien, admin voit tout ;
--   3. un trigger qui EMPÊCHE un non-admin de s'auto-approuver, même par un
--      appel direct à l'API (la policy d'écriture de l'auteur ne peut pas, seule,
--      interdire une valeur de colonne).
-- ════════════════════════════════════════════════════════════════════

alter table public.avis
  add column if not exists statut text not null default 'en_attente'
    check (statut in ('en_attente', 'approuve', 'rejete'));

-- Les avis déjà en base venaient d'un système sans modération : on les honore.
-- (S'exécute AVANT la création du trigger, donc rien ne les repasse en attente.)
update public.avis set statut = 'approuve' where statut = 'en_attente';

create index if not exists idx_avis_statut_created
  on public.avis (statut, created_at desc);

-- ── Lecture ──
-- Public = approuvés uniquement. Chacun voit toujours le sien (y compris en
-- attente, pour connaître son état). Un admin voit tout pour modérer.
drop policy if exists "avis lisibles par tous" on public.avis;
drop policy if exists "avis approuves publics" on public.avis;
create policy "avis approuves publics" on public.avis
  for select using (
    statut = 'approuve'
    or auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- ── Modération ──
-- Un admin peut changer le statut de n'importe quel avis.
drop policy if exists "avis moderes par admin" on public.avis;
create policy "avis moderes par admin" on public.avis
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- ── Garde-fou anti auto-approbation ──
-- Toute écriture d'un non-admin (insert ou upsert/édition) retombe en attente.
-- Un avis modifié repasse donc en modération : on ne peut pas publier un avis
-- gentil, le faire approuver, puis l'éditer en spam.
create or replace function public.avis_moderation_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then
    new.statut := 'en_attente';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_avis_moderation on public.avis;
create trigger trg_avis_moderation
  before insert or update on public.avis
  for each row execute function public.avis_moderation_guard();
