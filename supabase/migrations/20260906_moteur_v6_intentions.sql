/* ════════════════════════════════════════════════════════════════════
   V6 · LA TABLE PORTE ENFIN SON NOM, ET LES INVARIANTS SONT TENUS PAR
   LA BASE

   `planning_days` ne parlait ni de la bonne chose ni du bon objet : une
   ligne n'est pas un JOUR, c'est une INTENTION, et elle peut être une
   séance ou un repos. `seances_prevues` avait été écarté pour la même
   raison (une ligne « repos » y serait un contresens).

   ⚠️ ⚠️ NE PAS APPLIQUER AVANT QUE LE CODE TRANSITOIRE SOIT DÉPLOYÉ
   PARTOUT, PRODUCTION COMPRISE. Ce n'est pas une précaution de style,
   c'est mesuré : `main` (la production) lit `planning_days`, demande la
   colonne `status`, et écrit avec `on_conflict=user_id,date`. Après ce
   fichier, les trois sont faux. Une vue de compatibilité ne suffirait
   PAS, et c'est la correction posée par Louis au plan : elle protège le
   NOM de la table, pas le SENS de ses valeurs. Un déploiement qui lit
   `status` et reçoit `prevue` ne plante pas, il comprend de travers, et
   « faite » cesse silencieusement d'être reconnue. Elle ne rattraperait
   pas non plus l'`on_conflict`, qui exige une contrainte d'unicité sur
   la relation, ce qu'une vue ne peut pas porter.

   L'ORDRE, ET IL N'EST PAS NÉGOCIABLE :
     1. le code transitoire (`schemaIntentions`, qui comprend les deux
        vocabulaires et les deux noms) part en production ;
     2. ce fichier ;
     3. plus tard, quand plus aucun déploiement n'a l'ancien contrat en
        tête, la couche transitoire disparaît.

   ⚠️ CE QUE CE FICHIER NE FAIT PAS : il ne retire PAS
   `UNIQUE (user_id, date)`. La journée à deux séances demande de
   réécrire toutes les écritures (plus aucun `on_conflict` possible) et
   le modèle côté écran, qui indexe encore une semaine par date. C'est
   V6b, et c'est un point de non-retour à part : dès la première journée
   à deux séances, le retour en arrière est impossible.

   Rejouable : chaque étape se teste avant d'agir.
   ════════════════════════════════════════════════════════════════════ */

/* ─────────────── 1. Le nom ─────────────── */

do $$
begin
  if to_regclass('public.intentions_entrainement') is null then
    alter table public.planning_days rename to intentions_entrainement;
  end if;
end $$;

/* ─────────────── 2. Le vocabulaire ───────────────

   ⚠️ LE DÉFAUT SE RETIRE AVANT LA BASCULE ET SE REPOSE APRÈS. Une valeur
   par défaut est une expression contrôlée par la contrainte : la poser
   après avoir écrit les nouvelles valeurs évite qu'un `insert` glissé
   entre les deux écrive encore « planned ».                             */

do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'intentions_entrainement'
       and column_name = 'status'
  ) then
    alter table public.intentions_entrainement alter column status drop default;
    alter table public.intentions_entrainement rename column status to statut;
  end if;
end $$;

update public.intentions_entrainement
   set statut = case statut
                  when 'planned' then 'prevue'
                  when 'done'    then 'faite'
                  when 'skipped' then 'passee'
                  else statut
                end
 where statut in ('planned', 'done', 'skipped');

alter table public.intentions_entrainement alter column statut set default 'prevue';

/* ─────────────── 3. La date devient facultative ───────────────

   C'est la moitié structurelle de « aucune ligne = rien de prévu » :
   une intention peut exister sans jour, et c'est même la forme normale
   de la prochaine étape d'un cycle. `UNIQUE (user_id, date)` reste en
   place et ne gêne pas : en PostgreSQL, deux NULL ne se ressemblent
   pas, donc plusieurs intentions non datées y échappent déjà.          */

alter table public.intentions_entrainement alter column date drop not null;

/* ─────────────── 4. Les invariants ───────────────

   Tenus par la BASE et pas par le chemin d'écriture : un invariant tenu
   par le code se perd au premier deuxième appelant, et le chantier en a
   déjà trois (les écrans, le Guide, le cycle).                          */

do $$
begin
  /* Le vocabulaire est FERMÉ. Il ne l'était pas : la colonne acceptait
     n'importe quelle chaîne, donc une faute de frappe passait et une
     intention devenait invisible sans que rien ne le dise. */
  if not exists (select 1 from pg_constraint where conname = 'intentions_statut_check') then
    alter table public.intentions_entrainement
      add constraint intentions_statut_check
      check (statut in ('prevue', 'faite', 'passee'));
  end if;

  /* ⚠️ UN REPOS EST DATÉ ET VIDE. Un repos sans date ne veut rien dire
     (se reposer « un jour », c'est ne rien dire), et un repos qui porte
     des exercices est une séance qui s'ignore. */
  if not exists (select 1 from pg_constraint where conname = 'intentions_repos_check') then
    alter table public.intentions_entrainement
      add constraint intentions_repos_check
      check (
        nature <> 'repos'
        or (date is not null and coalesce(jsonb_array_length(exercise_list), 0) = 0)
      );
  end if;

  /* ⚠️ `consommee_le` NON NUL SI ET SEULEMENT SI L'INTENTION EST
     RÉSOLUE. C'est la colonne qui ORDONNE le curseur du cycle : une
     intention résolue sans elle disparaîtrait du classement, et une
     intention prévue qui la porterait ferait avancer le cycle sans que
     rien n'ait été fait. */
  if not exists (select 1 from pg_constraint where conname = 'intentions_consommee_check') then
    alter table public.intentions_entrainement
      add constraint intentions_consommee_check
      check ((statut = 'prevue') = (consommee_le is null));
  end if;
end $$;

/* ⚠️ UNE SEULE INTENTION NON DATÉE EN ATTENTE. « La seule ligne sans
   date est toujours la prochaine étape » : deux ne seraient plus une
   prochaine étape, ce serait une file d'attente, et l'écran devrait
   choisir laquelle montrer. */
create unique index if not exists uniq_intention_non_datee
    on public.intentions_entrainement (user_id)
 where date is null and statut = 'prevue';

/* ⚠️ UNE SEULE INTENTION EN ATTENTE PAR ÉTAPE. Elle interdit de réserver
   deux fois la même étape du cycle (le double-réservage en mode hybride)
   SANS limiter les suppléments, dont l'étape est NULL : en PostgreSQL,
   deux NULL ne se ressemblent pas, donc ils échappent à l'unicité. */
create unique index if not exists uniq_intention_par_etape
    on public.intentions_entrainement (user_id, etape_consommee_id)
 where etape_consommee_id is not null and statut = 'prevue';

/* ─────────────── 5. Les noms qui mentaient ───────────────

   Une contrainte `planning_days_provenance_fkey` sur une table qui ne
   s'appelle plus comme ça, c'est un nom qui ment, et un nom qui ment
   coûte cher le jour où on lit un message d'erreur. Purement cosmétique,
   aucun comportement ne change : PostgREST résout `on_conflict` par les
   COLONNES, jamais par le nom de la contrainte.                         */

do $$
declare
  paire text[];
begin
  foreach paire slice 1 in array array[
    ['planning_days_pkey',                'intentions_pkey'],
    ['planning_days_user_id_date_key',    'intentions_user_date_key'],
    ['planning_days_user_id_fkey',        'intentions_user_fkey'],
    ['planning_days_session_id_fkey',     'intentions_session_fkey'],
    ['planning_days_nature_check',        'intentions_nature_check'],
    ['planning_days_origine_check',       'intentions_origine_check'],
    ['planning_days_provenance_check',    'intentions_provenance_check'],
    ['planning_days_etape_check',         'intentions_etape_check'],
    ['planning_days_provenance_fkey',     'intentions_provenance_fkey'],
    ['planning_days_etape_fkey',          'intentions_etape_fkey']
  ] loop
    if exists (select 1 from pg_constraint where conname = paire[1])
       and not exists (select 1 from pg_constraint where conname = paire[2]) then
      execute format('alter table public.intentions_entrainement rename constraint %I to %I', paire[1], paire[2]);
    end if;
  end loop;

  foreach paire slice 1 in array array[
    ['idx_planning_days_consommee',  'idx_intentions_consommee'],
    ['idx_planning_days_curseur',    'idx_intentions_curseur'],
    ['idx_planning_days_programme',  'idx_intentions_programme'],
    ['planning_days_user_date_idx',  'idx_intentions_user_date']
  ] loop
    if to_regclass('public.' || paire[1]) is not null
       and to_regclass('public.' || paire[2]) is null then
      execute format('alter index public.%I rename to %I', paire[1], paire[2]);
    end if;
  end loop;
end $$;

/* Les policies suivent la table : `planning_days` était déjà en RLS
   propriétaire (`auth.uid() = user_id`) et un renommage ne les touche
   pas. Rien à réécrire, et surtout rien à rouvrir. */
