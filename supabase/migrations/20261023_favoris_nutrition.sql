-- ─────────────────────────────────────────────────────────────
-- Les favoris de la nutrition (Louis, 2026-10-23, maquette « Les
-- favoris » validée : « garde-les dans mon compte »).
--
-- Deux sortes, une seule table :
--   · une RECETTE de la banque (`cle` = son identifiant, le slug de
--     lib/recipeBank). Ses macros vivent dans la banque, pas ici ;
--   · un PLAT qu'on remet souvent (`cle` = son nom comparable, en
--     minuscules et sans espace en trop, comme `nomComparable`). On
--     garde ses macros : c'est elles qu'on réécrit en un geste.
--
-- Les plats « épinglés » d'avant (localStorage, appui long) sont
-- recopiés ici par l'app à la première ouverture, puis oubliés sur
-- l'appareil. Rien à reprendre côté base.
--
-- Propriétaire seulement : personne ne voit les favoris de quelqu'un
-- d'autre. Pas de mise à jour : on retire, on remet. Un plafond de
-- 500 lignes par compte empêche un script de remplir la base. La
-- suppression du compte emporte tout (clé en cascade). Rejouable.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.favoris_nutrition (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  sorte      text not null check (sorte in ('recette', 'plat')),
  cle        text not null check (char_length(cle) between 1 and 160),
  nom        text not null check (char_length(nom) between 1 and 160),
  calories   integer check (calories is null or calories >= 0),
  proteins   integer check (proteins is null or proteins >= 0),
  carbs      integer check (carbs is null or carbs >= 0),
  fats       integer check (fats is null or fats >= 0),
  created_at timestamptz not null default now(),
  constraint favoris_nutrition_unique unique (user_id, sorte, cle)
);

alter table public.favoris_nutrition enable row level security;

-- Les droits de base de Supabase donnent tout à `anon` et à
-- `authenticated`. On ne garde que ce dont l'écran a besoin.
revoke all on table public.favoris_nutrition from anon, authenticated;
grant select, insert, delete on table public.favoris_nutrition to authenticated;

drop policy if exists "favoris : les siens" on public.favoris_nutrition;
create policy "favoris : les siens" on public.favoris_nutrition
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "favoris : en ajouter" on public.favoris_nutrition;
create policy "favoris : en ajouter" on public.favoris_nutrition
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "favoris : en retirer" on public.favoris_nutrition;
create policy "favoris : en retirer" on public.favoris_nutrition
  for delete to authenticated using (user_id = auth.uid());

-- Le plafond. Sous RLS le compte ne voit que ses lignes, ce qui est
-- exactement ce qu'on compte.
create or replace function public.favoris_nutrition_plafond()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from public.favoris_nutrition f where f.user_id = new.user_id) >= 500 then
    raise exception 'favoris_pleins' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.favoris_nutrition_plafond() from public, anon, authenticated;

drop trigger if exists favoris_nutrition_plafond on public.favoris_nutrition;
create trigger favoris_nutrition_plafond
  before insert on public.favoris_nutrition
  for each row execute function public.favoris_nutrition_plafond();
