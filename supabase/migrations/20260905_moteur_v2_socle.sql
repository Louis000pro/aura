/* ════════════════════════════════════════════════════════════════════
   V2 · LE SOCLE ADDITIF DU MOTEUR DE PROGRAMME

   Deuxième migration du chantier « moteur de programme ». Elle est
   STRICTEMENT ADDITIVE : elle ne crée que des colonnes neuves et ne
   remplit qu'elles. Aucune colonne existante n'est modifiée, aucune
   contrainte existante n'est retirée, aucune ligne n'est supprimée.
   Tant que le code ne lit pas ces colonnes, l'app se comporte
   exactement comme avant. Rejouable sans risque.

   Ce qu'elle pose, et pourquoi :

   · `nature`  — une ligne dit une SÉANCE ou un REPOS. Aujourd'hui c'est
     déduit de `type = 'Repos'`, c'est-à-dire d'un LIBELLÉ d'affichage :
     renommer le badge changerait le sens des données. Et surtout, sans
     cette colonne, le prédicat « séance non faite » remonterait TOUS
     les repos passés comme des séances ratées.

   · `origine` — le dernier auteur délibéré. `regenerateWeek` fait
     aujourd'hui `DELETE ... WHERE status='planned'` et efface sans
     distinction le remplissage automatique et les jours qu'on a posés
     soi-même. Avec cette colonne, la régénération ne touchera que
     `origine='systeme'`.

   · `consommee_le` — QUAND l'intention a été résolue. Le curseur du
     cycle s'ordonnera par cette date et jamais par `date` : une
     intention non datée n'en a pas. C'est la leçon déjà payée deux
     fois (l'EXP, la série) : un compteur se désynchronise, une
     dérivation ne le peut pas.

   · `workout_sessions.seance_prevue_id` — la seule colonne ajoutée au
     journal. Elle est CONTEXTUELLE : `workout_sessions.exercises` reste
     auto-suffisant et demeure la source de vérité de ce qui a eu lieu.
     D'où `ON DELETE SET NULL` : effacer une intention n'efface pas un
     fait.

   ⚠️ Les trois colonnes de PROVENANCE (`programme_id`,
   `programme_seance_id`, `etape_consommee_id`) ne sont PAS ici : elles
   pointent vers des tables que V4 crée, et une FK ne peut pas précéder
   sa cible.
   ════════════════════════════════════════════════════════════════════ */

/* ─────────────── 1. Les colonnes ─────────────── */

alter table public.planning_days
  add column if not exists nature       text        not null default 'seance',
  add column if not exists origine      text        not null default 'systeme',
  add column if not exists consommee_le timestamptz;

alter table public.workout_sessions
  add column if not exists seance_prevue_id uuid
    references public.planning_days(id) on delete set null;

/* ─────────────── 2. Le backfill (colonnes neuves UNIQUEMENT) ───────────────

   `nature` : le libellé « Repos » est le seul marqueur dont on dispose
   sur l'existant. Vérifié en base avant d'écrire cette migration : zéro
   ligne « Repos » porte des exercices, et zéro ligne non-Repos n'en
   porte aucun. Les deux définitions coïncident donc parfaitement sur
   les données actuelles, et la bascule ne change rien à l'écran.        */
update public.planning_days
   set nature = 'repos'
 where lower(type) = 'repos'
   and nature <> 'repos';

/* `consommee_le` : une intention résolue a forcément été résolue au
   moment où on l'a marquée. `updated_at` est la meilleure approximation
   disponible, et la seule. */
update public.planning_days
   set consommee_le = updated_at
 where status in ('done', 'skipped')
   and consommee_le is null;

/* `origine` : on ne peut pas savoir QUI a écrit une ligne d'avant cette
   migration. On sait en revanche laquelle a été TOUCHÉE après sa
   création, et le doute doit profiter à la personne : une ligne
   modifiée à la main est protégée de la prochaine régénération, une
   ligne jamais retouchée reste du mobilier automatique. Le seuil de
   2 secondes n'est pas arbitraire : `dayToRow` écrit toujours
   `updated_at = now()` côté client alors que `created_at` vaut le
   `now()` du serveur, donc une ligne fraîche affiche déjà quelques
   millisecondes d'écart. Mesuré en base : 13 lignes concernées. */
update public.planning_days
   set origine = 'utilisateur'
 where status = 'planned'
   and origine = 'systeme'
   and updated_at - created_at >= interval '2 seconds';

/* ─────────────── 3. Le vocabulaire est FERMÉ ───────────────

   Une valeur inconnue est refusée à l'écriture, jamais ignorée : c'est
   la même règle que pour les axes d'adaptation. Les contraintes sont
   posées APRÈS le backfill, et dans un bloc idempotent (PostgreSQL
   n'a pas d'`ADD CONSTRAINT IF NOT EXISTS`).                            */
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'planning_days_nature_check') then
    alter table public.planning_days
      add constraint planning_days_nature_check check (nature in ('seance', 'repos'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'planning_days_origine_check') then
    alter table public.planning_days
      add constraint planning_days_origine_check check (origine in ('systeme', 'utilisateur', 'guide'));
  end if;
end $$;

/* ─────────────── 4. L'index du curseur ───────────────

   Le curseur du cycle se dérivera de la dernière intention résolue,
   ordonnée par `consommee_le`. Partiel, parce que l'immense majorité
   des lignes ne sont pas résolues et n'ont rien à faire dans l'index.  */
create index if not exists idx_planning_days_consommee
    on public.planning_days (user_id, consommee_le desc)
 where consommee_le is not null;

create index if not exists idx_workout_sessions_seance_prevue
    on public.workout_sessions (seance_prevue_id)
 where seance_prevue_id is not null;

/* Aucune policy à écrire : `planning_days` et `workout_sessions` sont
   déjà en RLS propriétaire (`auth.uid() = user_id`), et une colonne
   neuve hérite de la policy de sa table. */
