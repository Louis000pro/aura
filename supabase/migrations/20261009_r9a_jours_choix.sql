-- ════════════════════════════════════════════════════════════════════
-- R9a · tour 38 de Codex : « aucun choix » ≠ « zéro jour choisi », et
-- une règle a une date d'effet.
--
-- · Une ligne avec `jours = '{}'` veut dire « j'ai choisi : aucun jour
--   d'entraînement ». L'absence de ligne garde le comportement historique.
-- · `effet_le` : le premier jour où la règle s'applique. Choisir lundi un
--   jeudi n'invente pas « t'attendait lundi » pour une règle qui n'existait
--   pas encore.
--
-- À appliquer APRÈS 20261008_r9a_jours_entrainement.sql. Rejouable. La
-- table est neuve (aucune ligne au moment de l'écrire) : rien n'est converti.
-- ════════════════════════════════════════════════════════════════════

alter table public.jours_entrainement drop constraint if exists jours_entrainement_valeurs;
alter table public.jours_entrainement add constraint jours_entrainement_valeurs check (
  cardinality(jours) between 0 and 7
  and jours <@ array[1,2,3,4,5,6,7]::smallint[]
);

alter table public.jours_entrainement
  add column if not exists effet_le date not null default current_date;

-- ── Retour arrière ───────────────────────────────────────────────────
--   alter table public.jours_entrainement drop column if exists effet_le;
--   (la contrainte d'origine refuserait ensuite une ligne à zéro jour)
