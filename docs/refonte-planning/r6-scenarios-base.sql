/* ════════════════════════════════════════════════════════════════════
   R6 · SCÉNARIOS SUR LA VRAIE BASE, DANS UNE TRANSACTION ANNULÉE

   Se joue EN UN SEUL ENVOI, collé à la suite de
   `supabase/migrations/20261004_r6_occurrences.sql`, précédé de
   l'empreinte « avant » ci-dessous. Le dernier geste lève une exception :
   la migration ET les scénarios sont annulés, la base ne garde rien.

   Comptes : U = d193d5b2 (programme e1d32dc8, cycle de 4 : Haut, Bas,
   Push, Pull ; quatre fermetures, plancher repris à 5), AUTRE = a8476cf5.
   ════════════════════════════════════════════════════════════════════ */

/* À placer AVANT la migration dans le même envoi : */
-- create temp table r6_avant as
--   select md5(string_agg(concat_ws('|', id, statut, date, consommee_le, etape_consommee_id,
--          programme_id, programme_seance_id, lancement_id, nature, origine), ',' order by id)) as e,
--          count(*) as n
--   from public.intentions_entrainement;

do $r6$
declare
  U     constant uuid := 'd193d5b2-5866-4cba-9321-a37bdbeff772';
  AUTRE constant uuid := 'a8476cf5-7057-42c5-9751-3504d126c67d';
  P     constant uuid := 'e1d32dc8-2808-4ca4-87e4-275c74dc9b1b';
  E1    constant uuid := 'a10da651-0b5d-408b-8367-768c7af40b51'; -- Haut (A)
  E2    constant uuid := 'f6df8f1e-4a94-4a96-9c9d-8910a8449f20'; -- Bas  (B)
  E3    constant uuid := '29bd97c0-1843-4ba5-b8c7-44ab9a8ac785'; -- Push (C)
  E4    constant uuid := 'd27bbc6d-8b3f-4c1a-b4c7-38b2337faa73'; -- Pull (D)
  L1    constant uuid := '6c000000-0000-4000-8000-000000000001';
  out   text := '';
  r int; r2 int; v int; t text; idr uuid; idr2 uuid; n int;
begin
  /* ── M1 · Les intentions existantes gardent leur sens et leur histoire ── */
  select md5(string_agg(concat_ws('|', id, statut, date, consommee_le, etape_consommee_id,
         programme_id, programme_seance_id, lancement_id, nature, origine), ',' order by id)), count(*)
    into t, n from public.intentions_entrainement;
  out := out || format('M1 sens=%s (%s lignes) ; ', t = (select e from r6_avant) and n = (select n from r6_avant), n);

  /* ── M2 · Les rangs repris sont ceux de l'ancien curseur ── */
  select string_agg(rang::text, ',' order by consommee_le) into t
    from public.intentions_entrainement where programme_id::text like 'ae4c607f%' and statut <> 'prevue';
  select rang_depart into v from public.programmes where id::text like 'ae4c607f%';
  out := out || format('M2 ae4c=%s/%s ', t, v);
  select string_agg(rang::text, ',' order by consommee_le) into t
    from public.intentions_entrainement where programme_id = P and statut <> 'prevue';
  select rang_depart into v from public.programmes where id = P;
  out := out || format('e1d3=%s/%s ', t, v);
  select string_agg(rang::text, ','), max(p.rang_depart) into t, v
    from public.intentions_entrainement i join public.programmes p on p.id = i.programme_id
    where i.programme_id::text like '9ab6a7f1%';
  out := out || format('9ab6(resa)=%s/%s ; ', t, v);
  select count(*) into n from public.intentions_entrainement where etape_consommee_id is not null and rang is null;
  out := out || format('sans_rang=%s ; ', n);

  /* Désormais sous le compte U, avec la RLS. */
  perform set_config('request.jwt.claims', json_build_object('sub', U, 'role', 'authenticated')::text, true);
  set local role authenticated;

  /* ── S1 · C avant B : B garde son occurrence ── */
  insert into public.intentions_entrainement (user_id, date, type, title, difficulty, exercise_list, statut, nature, origine,
    programme_id, programme_seance_id, etape_consommee_id, consommee_le, lancement_id)
  values (U, '2026-10-04', 'Force', 'Haut', 'Intermédiaire', '[]', 'faite', 'seance', 'utilisateur', P, E1, E1, now(), L1)
  returning rang into r;
  insert into public.intentions_entrainement (user_id, date, type, title, difficulty, exercise_list, statut, nature, origine,
    programme_id, programme_seance_id, etape_consommee_id, consommee_le, lancement_id)
  values (U, '2026-10-05', 'Force', 'Push', 'Intermédiaire', '[]', 'faite', 'seance', 'utilisateur', P, E3, E3, now(), gen_random_uuid())
  returning rang into r2;
  insert into public.intentions_entrainement (user_id, date, type, title, difficulty, exercise_list, statut, nature, origine,
    programme_id, programme_seance_id, etape_consommee_id, consommee_le, lancement_id)
  values (U, '2026-10-06', 'Force', 'Bas', 'Intermédiaire', '[]', 'faite', 'seance', 'utilisateur', P, E2, E2, now(), gen_random_uuid())
  returning rang into v;
  out := out || format('S1 A=%s C=%s puis B=%s (attendu 5,7,6) ; ', r, r2, v);

  /* ── S2 · Déplacer garde l'identité, fermer garde le rang ── */
  insert into public.intentions_entrainement (user_id, date, type, title, difficulty, exercise_list, statut, nature, origine,
    programme_id, programme_seance_id, etape_consommee_id)
  values (U, '2026-10-10', 'Force', 'Pull', 'Intermédiaire', '[]', 'prevue', 'seance', 'utilisateur', P, E4, E4)
  returning id, rang into idr, r;
  update public.intentions_entrainement set date = '2026-10-12' where id = idr;
  update public.intentions_entrainement set statut = 'faite', consommee_le = now(), lancement_id = gen_random_uuid() where id = idr;
  select rang into r2 from public.intentions_entrainement where id = idr;
  out := out || format('S2 resa=%s deplacee+fermee=%s ; ', r, r2);

  /* ── S3 · Rejouer ne ferme rien deux fois ── */
  begin
    insert into public.intentions_entrainement (user_id, date, type, title, difficulty, exercise_list, statut, nature, origine,
      programme_id, programme_seance_id, etape_consommee_id, consommee_le, lancement_id)
    values (U, '2026-10-04', 'Force', 'Haut', 'Intermédiaire', '[]', 'faite', 'seance', 'utilisateur', P, E1, E1, now(), L1);
    out := out || 'S3a REJEU ACCEPTÉ ; ';
  exception when unique_violation then
    get stacked diagnostics t = constraint_name;
    out := out || format('S3a refus=%s ; ', t);
  end;
  begin
    insert into public.intentions_entrainement (user_id, date, type, title, difficulty, exercise_list, statut, nature, origine,
      programme_id, programme_seance_id, etape_consommee_id, rang, consommee_le, lancement_id)
    values (U, '2026-10-04', 'Force', 'Haut', 'Intermédiaire', '[]', 'faite', 'seance', 'utilisateur', P, E1, E1, 5, now(), gen_random_uuid());
    out := out || 'S3b DOUBLE FERMETURE ACCEPTÉE ; ';
  exception when unique_violation then
    get stacked diagnostics t = constraint_name;
    out := out || format('S3b refus=%s ; ', t);
  end;

  /* ── S4 · Un rang qui ne correspond pas à son étape est refusé ── */
  begin
    insert into public.intentions_entrainement (user_id, date, type, title, difficulty, exercise_list, statut, nature, origine,
      programme_id, programme_seance_id, etape_consommee_id, rang)
    values (U, '2026-10-20', 'Force', 'Haut', 'Intermédiaire', '[]', 'prevue', 'seance', 'utilisateur', P, E1, E1, 10);
    out := out || 'S4 INCOHÉRENT ACCEPTÉ ; ';
  exception when check_violation then
    out := out || 'S4 refus=incoherent ; ';
  end;

  /* ── S5 · Refaire : un journal sans occurrence ne bouge rien ── */
  select public.rang_minimal(P) into r;
  insert into public.intentions_entrainement (user_id, date, type, title, difficulty, exercise_list, statut, nature, origine,
    consommee_le, lancement_id, rang)
  values (U, '2026-10-06', 'Force', 'Haut (refaite)', 'Intermédiaire', '[]', 'faite', 'seance', 'utilisateur', now(), gen_random_uuid(), 3)
  returning rang into r2;
  select public.rang_minimal(P) into v;
  out := out || format('S5 rang_supplement=%s plancher %s→%s ; ', coalesce(r2::text, 'null'), r, v);

  /* ── S6 · Changer l'étape d'une réservation recalcule son occurrence ── */
  insert into public.intentions_entrainement (user_id, date, type, title, difficulty, exercise_list, statut, nature, origine,
    programme_id, programme_seance_id, etape_consommee_id)
  values (U, '2026-10-14', 'Force', 'Haut', 'Intermédiaire', '[]', 'prevue', 'seance', 'utilisateur', P, E1, E1)
  returning id, rang into idr2, r;
  update public.intentions_entrainement set etape_consommee_id = E3, programme_seance_id = E3 where id = idr2;
  select rang into r2 from public.intentions_entrainement where id = idr2;
  out := out || format('S6 Haut=%s devient Push=%s ; ', r, r2);

  /* ── S7 · Une autre personne ne voit ni n'écrit rien ici ── */
  perform set_config('request.jwt.claims', json_build_object('sub', AUTRE, 'role', 'authenticated')::text, true);
  select count(*) into n from public.intentions_entrainement where programme_id = P;
  out := out || format('S7 visibles_par_autre=%s ', n);
  begin
    insert into public.intentions_entrainement (user_id, date, type, title, difficulty, exercise_list, statut, nature, origine,
      programme_id, programme_seance_id, etape_consommee_id)
    values (U, '2026-10-21', 'Force', 'Haut', 'Intermédiaire', '[]', 'prevue', 'seance', 'utilisateur', P, E1, E1);
    out := out || 'ECRITURE_AUTRE_ACCEPTEE';
  exception when insufficient_privilege then
    out := out || 'refus=42501';
  end;

  raise exception 'R6_SCENARIOS %', out;
end $r6$;
