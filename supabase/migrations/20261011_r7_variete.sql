/* ════════════════════════════════════════════════════════════════════
   R7 · LE RÉGLAGE DE VARIÉTÉ (décision 52 ; maquette 07 écran 01)

   À coller APRÈS `20261010_r9c_activer_programme.sql`. Rejouable.
   Additive : une colonne, aucune donnée touchée.

   ⚠️ NULL = LE DÉFAUT (« Un peu de nouveauté »). On n'écrit pas le
   défaut chez tout le monde : il n'est enregistré que lorsque quelqu'un
   choisit. Le vocabulaire est FERMÉ : une valeur inconnue est refusée,
   jamais ignorée.

   Le réglage vit dans `contexte_entrainement`, la source unique du
   contexte depuis V3, avec sa RLS propriétaire existante : aucune
   policy à ajouter.

   Il ne décide que des occurrences PAS ENCORE ÉCRITES. Une occurrence
   réservée ou faite garde sa prescription (R2), quel que soit le
   réglage ensuite.
   ════════════════════════════════════════════════════════════════════ */

alter table public.contexte_entrainement
  add column if not exists variete text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'contexte_variete_check'
  ) then
    alter table public.contexte_entrainement
      add constraint contexte_variete_check
      check (variete is null or variete in ('habituels', 'peu', 'beaucoup'));
  end if;
end $$;
