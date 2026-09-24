-- ════════════════════════════════════════════════════════════════════
-- « Le pseudo a-t-il été CHOISI par la personne, ou généré pour elle ? »
--
-- Les comptes Google arrivent sans pseudo : `ensure-profile` en fabrique un
-- à partir du nom ou de l'email. On veut alors proposer UNE fois un écran
-- « choisis ton pseudo » juste après la première connexion. Cette colonne
-- distingue le pseudo choisi (true) du pseudo fabriqué (false).
--
-- ⚠️ DEFAULT true, ET C'EST VOULU : tous les comptes existants (et tous les
-- comptes créés par le formulaire email, qui donnent leur pseudo) sont
-- considérés comme ayant déjà choisi. Seul `ensure-profile` pose false, et
-- seulement quand il a dû INVENTER le pseudo. Un backfill serait donc un
-- contresens : il n'y a rien à réparer, le défaut dit déjà le vrai.
--
-- Le code sait vivre SANS cette colonne (lecture défensive) : tant que ce
-- SQL n'est pas collé, aucun écran ne s'affiche et rien ne change.
-- ════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists pseudo_choisi boolean not null default true;
