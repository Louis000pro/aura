/* ════════════════════════════════════════════════════════════════════
   V3 · LE CONTEXTE D'ENTRAÎNEMENT A UNE SOURCE UNIQUE

   Troisième migration du chantier. Additive : elle crée UNE table et ne
   touche à aucune colonne existante. Rejouable.

   Aujourd'hui « où je m'entraîne et avec quoi » vit à DEUX endroits :
   `profiles.training_location` / `training_equipment` d'un côté, et le
   localStorage de chaque appareil de l'autre. Deux autorités pour une
   seule règle finissent toujours par diverger, c'est le problème déjà
   payé sur l'EXP et sur la série.

   `contexte_entrainement` devient le DÉFAUT de la chaîne de surcharge
   « intention → adaptation → programme → contexte ». Chaque niveau est
   nullable, et NULL veut dire « hérite », jamais « vide ».

   ⚠️ TRANSITION EN DUAL-WRITE, ET C'EST LA CORRECTION POSÉE PAR LOUIS
   AU PLAN. Le rollback de cette vague supposait que
   `profiles.training_location` reste à jour, ce qui cesse d'être vrai à
   la seconde où cette table devient l'autorité. Le code écrit donc dans
   LES DEUX modèles jusqu'à stabilisation : revenir en arrière ne demande
   alors qu'un redéploiement, sans backfill inverse.

   ⚠️ LES DISPONIBILITÉS (impossible / préféré / flexible) sont le futur
   logement de cette table et ne sont PAS développées ici. Aucune colonne
   n'est posée pour elles : une colonne qu'aucun moteur n'applique est
   une promesse que l'écran finira par afficher.
   ════════════════════════════════════════════════════════════════════ */

create table if not exists public.contexte_entrainement (
  user_id         uuid primary key references auth.users(id) on delete cascade,

  -- Le doublon d'aujourd'hui, rapatrié. NULL = jamais répondu.
  lieu            text,
  materiel        text,

  -- Ce que la personne VISE, pas ce qu'on lui impose : une cible n'est
  -- pas un plafond. `seances_max` et `duree_max_min` n'existent pas ici
  -- et ne doivent pas y être ajoutés « pour compléter ».
  seances_cible   int,
  duree_cible_min int,

  cree_le         timestamptz not null default now(),
  maj_le          timestamptz not null default now(),

  /* Le vocabulaire est FERMÉ : une valeur inconnue est refusée à
     l'écriture, jamais ignorée. NULL reste permis partout, c'est lui qui
     dit « hérite ».
     ⚠️ Les bornes de `seances_cible` sont larges EXPRÈS : mesuré en base
     avant d'écrire, une personne a répondu 0 séance par semaine. Une
     contrainte « entre 1 et 7 » aurait fait échouer le backfill sur une
     réponse pourtant parfaitement légitime. */
  constraint contexte_lieu_check     check (lieu     is null or lieu     in ('salle', 'maison')),
  constraint contexte_materiel_check check (materiel is null or materiel in ('halteres', 'poids')),
  constraint contexte_seances_check  check (seances_cible   is null or seances_cible   between 0 and 14),
  constraint contexte_duree_check    check (duree_cible_min is null or duree_cible_min between 5 and 300)
);

alter table public.contexte_entrainement enable row level security;

/* RLS propriétaire, comme `planning_days`. PostgreSQL n'a pas
   d'`CREATE POLICY IF NOT EXISTS` : la syntaxe existe dans beaucoup de
   souvenirs et dans aucune version de PostgreSQL, et c'est ce qui avait
   laissé `direct_messages` et `notifications` en RLS active SANS aucune
   policy, donc invisibles pour leur propre auteur. */
drop policy if exists "contexte_entrainement: owner full access" on public.contexte_entrainement;
create policy "contexte_entrainement: owner full access"
  on public.contexte_entrainement for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

/* ─────────────── Backfill depuis l'existant ───────────────

   Mesuré avant d'écrire : 40 profils sur 58 ont au moins une des trois
   valeurs (9 un lieu, 9 un matériel, 40 un nombre de séances), et aucun
   ne porte de valeur hors vocabulaire. Les 18 autres n'ont rien à
   reprendre et n'auront donc pas de ligne : une absence de ligne veut
   dire « on ne sait pas », exactement comme une colonne NULL.

   `on conflict do nothing` : la migration est rejouable et ne doit
   JAMAIS écraser un contexte déjà réglé par la personne depuis l'app. */
insert into public.contexte_entrainement (user_id, lieu, materiel, seances_cible)
select id, training_location, training_equipment, onboarding_sessions_week
  from public.profiles
 where training_location is not null
    or training_equipment is not null
    or onboarding_sessions_week is not null
on conflict (user_id) do nothing;

/* `maj_le` se tient tout seul : une colonne d'horodatage laissée à la
   charge de l'appelant finit toujours par mentir. */
create or replace function public.touch_contexte_entrainement()
returns trigger language plpgsql as $$
begin
  new.maj_le := now();
  return new;
end $$;

drop trigger if exists trg_touch_contexte_entrainement on public.contexte_entrainement;
create trigger trg_touch_contexte_entrainement
  before update on public.contexte_entrainement
  for each row execute function public.touch_contexte_entrainement();
