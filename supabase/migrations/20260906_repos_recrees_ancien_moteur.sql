/* ════════════════════════════════════════════════════════════════════
   LES REPOS QUE L'ANCIEN MOTEUR A RECRÉÉS APRÈS V5

   V5 a supprimé 225 repos système et arrêté le comportement qui les
   écrivait. Mais elle n'a arrêté que le comportement de la BRANCHE :
   `main` (la production) appelle toujours `ensureWeek`, qui fait un
   `upsert` sur `planning_days` à la simple lecture d'une semaine.

   ⚠️ CE N'EST PAS UNE HYPOTHÈSE, C'EST ARRIVÉ. Le 2026-09-05 à
   15 h 30 UTC, quelqu'un a ouvert la production et l'ancien moteur a
   recréé QUATRE repos système sur un compte, en une seule écriture
   groupée, exactement sept heures après que V5 les ait supprimés.

   ⚠️ ELLES ONT UNE SIGNATURE QUE RIEN D'AUTRE NE PORTE, ET C'EST CE
   QUI REND LA SUPPRESSION SÛRE. L'ancien code ne connaît pas la
   colonne `nature` (elle date de V2) : elle prend donc son DÉFAUT,
   `'seance'`, sur une ligne dont le `type` d'affichage vaut « Repos ».
   Aucune autre ligne de la table ne porte cette contradiction : les
   deux repos posés à la main sont en `nature = 'repos'`, et les 231
   autres lignes système sont de vraies séances (Force, HIIT).

   C'est pour ça que la migration de V5 ne les attrape pas : elle
   cherchait `nature = 'repos'`, ce que ces lignes ne sont pas.

   ⚠️ ET IL FAUT LES RETIRER, PAS SEULEMENT PAR PROPRETÉ. Le nouveau
   code lit `nature`, jamais le libellé. Il verrait donc quatre
   SÉANCES vides, dont trois DATÉES DANS LE PASSÉ et encore prévues :
   c'est exactement le prédicat `seanceNonFaite`, donc le Guide
   proposerait de rattraper des séances que personne n'a jamais
   prévues, sur des jours de repos automatiques.

   Rejouable : une seconde exécution ne trouve plus rien.
   ════════════════════════════════════════════════════════════════════ */

delete from public.planning_days d
 where d.type = 'Repos'
   and d.nature = 'seance'          -- la contradiction, donc l'ancien code
   and d.origine = 'systeme'
   and d.status = 'planned'
   and d.consommee_le is null
   and d.session_id is null
   and coalesce(jsonb_array_length(d.exercise_list), 0) = 0
   and not exists (
     select 1 from public.workout_sessions w where w.seance_prevue_id = d.id
   );
