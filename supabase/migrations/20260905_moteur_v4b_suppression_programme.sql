/* ════════════════════════════════════════════════════════════════════
   V4b · SUPPRIMER UN PROGRAMME NE DOIT PAS CASSER SES INTENTIONS

   Correctif de V4, trouvé en EXERÇANT la suppression d'un programme
   après l'avoir appliquée. Il n'apparaît dans aucun test de forme : il
   fallait supprimer une ligne pour le voir.

   ⚠️ CE QUI N'ALLAIT PAS. Les deux clés étrangères composites étaient en
   `on delete set null` PLEIN, donc chacune mettait à NULL les DEUX
   colonnes de son couple, `programme_id` compris. En supprimant un
   programme, la cascade efface ses étapes ; la première FK mettait alors
   `programme_id` à NULL alors que le renvoi de l'AUTRE FK était encore
   posé. Les deux CHECK (« un renvoi sans son programme n'existe pas »)
   sautaient au milieu de la cascade et le `DELETE` échouait :

     new row for relation "planning_days" violates check constraint
     "planning_days_provenance_check"

   ⚠️ POURQUOI ON NE PEUT PAS RÉPARER ÇA CÔTÉ CHECK. Un CHECK n'est pas
   « deferrable » en PostgreSQL : il est vérifié à chaque modification de
   ligne, y compris sur l'état transitoire d'une cascade. Tant qu'une
   action référentielle peut annuler `programme_id` avant l'autre renvoi,
   l'invariant est intenable. Même piège pour l'idée qui vient
   naturellement ensuite (ajouter `programme_id references programmes(id)
   on delete set null`) : elle recrée exactement le même état transitoire.

   LE CORRECTIF : le SET NULL porte sur SA PROPRE COLONNE (PostgreSQL
   15+, la base tourne en 17). `programme_id` n'est donc JAMAIS annulé
   par une cascade. Les deux renvois partent, l'intention reste, et les
   CHECK tiennent à chaque étape.

   ⚠️ CONSÉQUENCE ASSUMÉE : `programme_id` seul n'a pas d'intégrité
   référentielle propre, et ne peut pas en avoir (voir ci-dessus). La
   garantie qui compte est tenue : dès que les deux colonnes d'un couple
   sont posées, la FK composite vérifie que l'étape appartient bien AU
   programme déclaré. Un `programme_id` qui pointerait dans le vide ne
   peut venir que d'un `DELETE FROM programmes` à la main, or un
   programme s'ARCHIVE, il ne se supprime pas.

   ⚠️ LA SUPPRESSION D'UN COMPTE N'A JAMAIS ÉTÉ EN DANGER, et c'est
   vérifié et pas supposé : les lignes de `planning_days` partent par
   leur propre cascade depuis `auth.users`, sans passer par les actions
   référentielles du programme. Le seul chemin cassé était le `DELETE`
   explicite d'un programme, qu'aucun écran ne fait aujourd'hui.

   Aucune ligne concernée : 0 programme, 0 intention rattachée au moment
   du correctif. Rejouable.
   ════════════════════════════════════════════════════════════════════ */

alter table public.planning_days drop constraint if exists planning_days_provenance_fkey;
alter table public.planning_days drop constraint if exists planning_days_etape_fkey;

alter table public.planning_days
  add constraint planning_days_provenance_fkey
  foreign key (programme_id, programme_seance_id)
  references public.programme_seances (programme_id, id)
  on delete set null (programme_seance_id);

alter table public.planning_days
  add constraint planning_days_etape_fkey
  foreign key (programme_id, etape_consommee_id)
  references public.programme_seances (programme_id, id)
  on delete set null (etape_consommee_id);
