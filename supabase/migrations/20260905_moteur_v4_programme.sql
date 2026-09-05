/* ════════════════════════════════════════════════════════════════════
   V4 · LE PROGRAMME ET SON CYCLE

   Quatrième migration du chantier. Additive : deux tables neuves, trois
   colonnes neuves sur `planning_days`, et rien d'autre. Aucune ligne
   n'est créée : personne n'a de programme, donc l'app se comporte
   exactement comme avant. Rejouable.

   ⚠️ LE PROGRAMME EST PERSISTÉ DANS SA STRUCTURE, JAMAIS DANS SON
   AVENIR. `programmes` porte l'intention de fond, `programme_seances`
   porte le CYCLE (3 à 6 lignes, et leur ordre). Aucune séance future
   n'est écrite d'avance : un programme qui écrirait ses séances des mois
   à l'avance serait figé, quel que soit le vocabulaire employé. C'est
   exactement le défaut qu'on répare, mesuré sur `planning_days` : 469
   lignes en base, dont 227 « Repos » et 447 jamais retouchées. Le
   planning est à 95 % du mobilier automatique.

   ⚠️ PROVENANCE N'EST PAS L'EFFET SUR LE CYCLE, ET C'EST DEUX COLONNES.
   `programme_seance_id` dit D'OÙ VIENT LE CONTENU ; `etape_consommee_id`
   dit QUELLE ÉTAPE EST REFERMÉE. Les réduire à un booléen
   « avance_cycle » confondrait deux intentions différentes :
     « je saute B et je fais C »  → provenance C, étape C, prochaine D
     « je fais du C à la place du contenu de B, je garde la suite »
                                  → provenance C, étape B, prochaine C
   Défaut = substitution, rien n'est sauté ; le saut demande un signal
   explicite, et la carte NOMME la conséquence avant le clic.
   ════════════════════════════════════════════════════════════════════ */

/* ─────────────── 1. L'intention de fond ─────────────── */

create table if not exists public.programmes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,

  nom                text not null,
  intention          text,

  statut             text not null default 'actif',
  origine            text not null default 'systeme',

  /* ⚠️ Reporte le curseur d'une version à l'autre. Sans lui, un simple
     ajustement (une version archivée, une nouvelle créée) renverrait
     tout le monde à l'étape 1 de son cycle. */
  position_initiale  int  not null default 0,

  cree_le            timestamptz not null default now(),
  maj_le             timestamptz not null default now(),
  archive_le         timestamptz,

  constraint programmes_statut_check  check (statut  in ('actif', 'archive')),
  constraint programmes_origine_check check (origine in ('systeme', 'utilisateur', 'guide')),
  /* Un programme archivé porte sa date, un programme actif n'en a pas :
     l'état et sa date ne peuvent pas se contredire. */
  constraint programmes_archive_check check ((statut = 'archive') = (archive_le is not null))
);

/* ⚠️ UNE SEULE VERSION ACTIVE, ET C'EST LA BASE QUI LE TIENT, pas le
   chemin d'écriture. Un invariant tenu par le code se perd au premier
   deuxième appelant. Une modification permanente ARCHIVE et crée une
   nouvelle version, elle ne réécrit pas le passé. */
create unique index if not exists uniq_programme_actif
    on public.programmes (user_id)
 where statut = 'actif';

/* ─────────────── 2. Le cycle ─────────────── */

create table if not exists public.programme_seances (
  id            uuid primary key default gen_random_uuid(),
  programme_id  uuid not null references public.programmes(id) on delete cascade,

  /* La place dans le CYCLE, pas dans la semaine ni dans le calendrier.
     C'est ce qui permet au cycle de tourner sans jamais rien dater. */
  position      int  not null,

  nom           text not null,
  nature        text not null default 'seance',
  duree_min     int,
  origine       text not null default 'systeme',

  cree_le       timestamptz not null default now(),

  constraint programme_seances_nature_check   check (nature  in ('seance', 'repos')),
  constraint programme_seances_origine_check  check (origine in ('systeme', 'utilisateur', 'guide')),
  constraint programme_seances_duree_check    check (duree_min is null or duree_min between 5 and 300),
  constraint programme_seances_position_check check (position >= 0),

  constraint programme_seances_ordre_unique unique (programme_id, position),
  /* ⚠️ Cette seconde unicité n'est PAS un doublon de la clé primaire :
     c'est la CIBLE des deux clés étrangères composites de
     `planning_days`. Sans elle, PostgreSQL refuse de les créer. */
  constraint programme_seances_id_programme_unique unique (programme_id, id)
);

/* ─────────────── 3. Les deux colonnes de sens sur l'intention ─────────────── */

alter table public.planning_days
  add column if not exists programme_id        uuid,
  add column if not exists programme_seance_id uuid,
  add column if not exists etape_consommee_id  uuid;

/* ⚠️ LES DEUX FK CI-DESSOUS SONT CORRIGÉES PAR
   `20260905_moteur_v4b_suppression_programme.sql`, À COLLER JUSTE APRÈS
   CELLE-CI. Leur `on delete set null` plein annule `programme_id` en même
   temps que son renvoi, ce qui fait sauter les CHECK au milieu d'une
   cascade et casse la suppression d'un programme. V4b fait porter le SET
   NULL sur sa propre colonne. Ce fichier garde la version d'origine pour
   que le dépôt raconte ce qui a réellement été appliqué, et dans quel
   ordre. */
do $$
begin
  /* ⚠️ FK COMPOSITES : sans elles, une intention pourrait déclarer un
     programme et pointer l'étape d'un AUTRE. Elles sont en MATCH SIMPLE
     (le défaut) et c'est voulu : dès qu'une colonne du couple est NULL,
     la contrainte ne s'applique pas. C'est ce qui autorise le cas
     « ajouter », où l'intention vient bien d'une étape du programme mais
     n'en consomme aucune. MATCH FULL l'interdirait. */
  if not exists (select 1 from pg_constraint where conname = 'planning_days_provenance_fkey') then
    alter table public.planning_days
      add constraint planning_days_provenance_fkey
      foreign key (programme_id, programme_seance_id)
      references public.programme_seances (programme_id, id)
      on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'planning_days_etape_fkey') then
    alter table public.planning_days
      add constraint planning_days_etape_fkey
      foreign key (programme_id, etape_consommee_id)
      references public.programme_seances (programme_id, id)
      on delete set null;
  end if;

  /* Ce que MATCH SIMPLE laisse passer et qui n'aurait aucun sens : une
     étape sans son programme. Les deux CHECK ferment ce trou sans
     rouvrir celui que MATCH FULL créerait. */
  if not exists (select 1 from pg_constraint where conname = 'planning_days_provenance_check') then
    alter table public.planning_days
      add constraint planning_days_provenance_check
      check (programme_seance_id is null or programme_id is not null);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'planning_days_etape_check') then
    alter table public.planning_days
      add constraint planning_days_etape_check
      check (etape_consommee_id is null or programme_id is not null);
  end if;
end $$;

create index if not exists idx_planning_days_programme
    on public.planning_days (user_id, programme_id)
 where programme_id is not null;

/* ⚠️ L'INDEX DU CURSEUR. Le curseur se dérive de la dernière intention
   dont une étape est refermée, ordonnée par `consommee_le` (posée en V2)
   et JAMAIS par `date` : une intention non datée n'en a pas. Un compteur
   stocké se désynchronise, une dérivation ne le peut pas. */
create index if not exists idx_planning_days_curseur
    on public.planning_days (user_id, consommee_le desc)
 where etape_consommee_id is not null;

/* ─────────────── 4. RLS ─────────────── */

alter table public.programmes        enable row level security;
alter table public.programme_seances enable row level security;

drop policy if exists "programmes: owner full access" on public.programmes;
create policy "programmes: owner full access"
  on public.programmes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

/* Le cycle ne porte pas de `user_id`, et ne doit pas en porter : ce
   serait une seconde autorité sur la propriété d'une même donnée. Il
   hérite du programme. Aucune récursion possible, la sous-requête
   interroge une AUTRE table. */
drop policy if exists "programme_seances: owner via programme" on public.programme_seances;
create policy "programme_seances: owner via programme"
  on public.programme_seances for all
  using (exists (
    select 1 from public.programmes p
     where p.id = programme_seances.programme_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.programmes p
     where p.id = programme_seances.programme_id and p.user_id = auth.uid()
  ));

create or replace function public.touch_programme()
returns trigger language plpgsql as $fn$
begin
  new.maj_le := now();
  return new;
end $fn$;

drop trigger if exists trg_touch_programme on public.programmes;
create trigger trg_touch_programme
  before update on public.programmes
  for each row execute function public.touch_programme();
