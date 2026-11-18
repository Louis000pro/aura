/* ════════════════════════════════════════════════════════════════════
   LES RECORDS AJOUTÉS À LA MAIN (Louis, 2026-11-18 : « on ne sait pas
   comment ajouter des progrès », un bouton « Ajouter un record »).

   Jusqu'ici un record ne venait que du journal des séries
   (`series_realisees`), écrit seulement par `enregistrer_seance`.
   Quelqu'un qui connaît déjà son max (fait hors de Vaiiya, ou avant de
   s'inscrire) n'avait aucun moyen de le noter.

   Cette table garde ces valeurs déclarées à la main. `lib/records.ts`
   les mélange au journal : un record ajouté à la main est une marche
   comme une autre, et une séance qui le dépasse le fête.

   ⚠️ Pas d'EXP, pas de séance créée, rien ne compte pour la flamme ni
   les quêtes : c'est une note, pas une séance.
   ════════════════════════════════════════════════════════════════════ */

create table if not exists public.records_manuels (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  exercice_cle  text,
  exercice_nom  text not null check (char_length(exercice_nom) between 1 and 80),
  mesure        text not null check (mesure in ('reps', 'charge', 'duree')),
  /* Répétitions, kilos ou secondes, selon la mesure. */
  valeur        numeric(7,2) not null check (valeur > 0 and valeur <= 100000),
  /* Les répétitions faites à cette charge (mesure « charge » seulement). */
  reps          smallint check (reps is null or (reps >= 1 and reps <= 1000)),
  fait_le       timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  check (mesure = 'charge' or reps is null),
  check (fait_le <= now() + interval '1 day')
);

create index if not exists idx_records_manuels_user
  on public.records_manuels (user_id, fait_le);

alter table public.records_manuels enable row level security;

drop policy if exists "Lire ses records manuels" on public.records_manuels;
create policy "Lire ses records manuels"
  on public.records_manuels for select
  using (auth.uid() = user_id);

drop policy if exists "Ajouter ses records manuels" on public.records_manuels;
create policy "Ajouter ses records manuels"
  on public.records_manuels for insert
  with check (auth.uid() = user_id);

drop policy if exists "Retirer ses records manuels" on public.records_manuels;
create policy "Retirer ses records manuels"
  on public.records_manuels for delete
  using (auth.uid() = user_id);

grant select, insert, delete on public.records_manuels to authenticated;
