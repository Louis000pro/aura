/* ════════════════════════════════════════════════════════════════════
   V5 · LES REPOS QUE PERSONNE N'A CHOISIS S'EN VONT

   Le code ne pose plus de planning à la lecture. Restaient en base les
   lignes que l'ancien `ensureWeek` avait écrites : des jours « Repos »
   que personne n'a jamais demandés, posés simplement parce qu'on avait
   ouvert son planning.

   ⚠️ C'EST LE POINT DE NON-RETOUR DE LA VAGUE. Une ligne supprimée ne
   se recrée pas : l'ancien moteur qui les écrivait n'existe plus.

   ⚠️ CE QU'ELLE SUPPRIME, ET RIEN D'AUTRE : `nature = 'repos'` ET
   `origine = 'systeme'` ET `status = 'planned'` ET `consommee_le IS
   NULL` ET aucune séance du journal ne s'y rattache. Les quatre
   conditions comptent, et la troisième et la quatrième sont là pour
   qu'un repos RÉSOLU (donc de l'histoire) ne puisse pas partir même si
   l'une des deux premières était mal renseignée.

   ⚠️ CE QU'ELLE NE TOUCHE PAS, ET C'EST LE CŒUR DE LA COLONNE
   `origine` : un repos posé à la main reste. Mesuré avant application :
   225 repos système contre 2 repos utilisateur. Sans cette colonne, la
   suppression aurait emporté les deux, et personne ne s'en serait
   aperçu.

   ⚠️ ELLE NE TOUCHE PAS NON PLUS LES SÉANCES DÉJÀ ÉCRITES (222 lignes
   `planned`, dont 8 dans le futur). Ce sont de vraies séances, elles ne
   mentent sur rien, et le comportement qui les créait est arrêté : le
   futur se videra tout seul en une semaine. Les supprimer serait
   retirer à quelqu'un une semaine qu'il croit avoir.

   État mesuré avant : 469 lignes (227 repos, 242 séances, 9 résolues).
   Attendu après : 244 lignes (2 repos, 242 séances, 9 résolues).
   Rejouable : une deuxième exécution ne trouve plus rien.
   ════════════════════════════════════════════════════════════════════ */

delete from public.planning_days d
 where d.nature       = 'repos'
   and d.origine      = 'systeme'
   and d.status       = 'planned'
   and d.consommee_le is null
   /* Ceinture et bretelles : un « repos » qui porterait des exercices ne
      serait pas un repos, et une ligne citée par le journal a servi à
      quelque chose. Aucune des deux n'existe aujourd'hui (vérifié), et
      c'est justement pour ça qu'on peut se permettre de les exclure. */
   and coalesce(jsonb_array_length(d.exercise_list), 0) = 0
   and not exists (
     select 1 from public.workout_sessions w where w.seance_prevue_id = d.id
   );
