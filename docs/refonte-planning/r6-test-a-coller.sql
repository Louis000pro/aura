-- TEST R6 · à coller en entier dans le SQL Editor de Supabase, puis « Run ».
-- Il applique la migration, joue les scénarios, puis ANNULE TOUT : la base ne garde rien.
-- Le résultat s'affiche comme une erreur rouge qui commence par R6_SCENARIOS : c'est normal, envoie-moi une capture.
begin;
create temp table r6_avant as select md5(string_agg(concat_ws('|', id, statut, date, consommee_le, etape_consommee_id, programme_id, programme_seance_id, lancement_id, nature, origine), ',' order by id)) as e_avant, count(*) as n_avant from public.intentions_entrainement;
/* ════════════════════════════════════════════════════════════════════
   R6 · LES OCCURRENCES (refonte du planning, décisions 30 à 42)

   À coller dans le SQL Editor de Supabase APRÈS
   `20261003_r1_journal_series.sql`. Rejouable sans risque.

   ⚠️ À APPLIQUER AVANT DE DÉPLOYER LE CODE R6. Elle est compatible avec
   le code actuellement en production : une fermeture écrite sans rang
   (l'ancien code, ou une finalisation R1 restée en attente sur un
   téléphone) reçoit son rang du déclencheur.

   Le modèle. Chaque passage dans l'ordre du cycle est une OCCURRENCE,
   identifiée par son RANG dans le programme : Push₁ = 1, Pull₁ = 2, …,
   Push₂ = k + 1. L'étape d'un rang vaut ((rang - 1) mod k) + 1 dans
   l'ordre des positions ; elle ne se stocke pas en double, elle se
   VÉRIFIE (une ligne dont le rang ne correspond pas à son étape est
   refusée).

   Ce qu'elle ajoute :
   1. `intentions_entrainement.rang` : l'occurrence que la ligne réserve
      ou ferme. Nul si et seulement si la ligne ne porte aucune étape.
   2. `programmes.rang_depart` : le plancher. Aucune occurrence plus basse
      n'est jamais proposée ni attribuée.
   3. `attribuer_rang()` : donne un rang à une ligne qui porte une étape
      sans rang, vérifie celui qu'on lui donne, et RECALCULE le rang quand
      l'étape change. Sérialisé par programme (verrou consultatif).
   4. `uniq_occurrence` : une occurrence = une ligne. Une réservation
      devient la fermeture (même ligne) ; deux fermetures de la même
      occurrence sont impossibles.
   5. La reprise de l'existant, SANS CHANGER LE SENS D'UNE SEULE LIGNE :
      chaque fermeture reçoit le rang que l'ancien curseur lui donnait,
      `rang_depart` est posé sur l'occurrence que l'ancien curseur
      proposait, et chaque réservation en cours reçoit la première
      occurrence libre de son étape au-dessus de ce plancher. Aucun
      statut, aucune date, aucun `consommee_le` n'est touché.

   ⚠️ `uniq_intention_par_etape` RESTE EN PLACE. Elle tombera quand on
   pourra réserver deux occurrences de la même étape (placement groupé,
   décision 14). Aujourd'hui elle ne gêne aucun geste, et elle protège
   encore le code en production.
   ════════════════════════════════════════════════════════════════════ */

/* ─────────────── 1 et 2. Les colonnes ─────────────── */

alter table public.intentions_entrainement add column if not exists rang integer;
alter table public.programmes add column if not exists rang_depart integer;

do $$ begin
  alter table public.intentions_entrainement
    add constraint intentions_rang_positif check (rang is null or rang >= 1);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.programmes
    add constraint programmes_rang_depart_positif check (rang_depart is null or rang_depart >= 1);
exception when duplicate_object then null; end $$;

/* ─────────────── Les deux règles, en SQL ───────────────

   Elles sont la traduction exacte de `rangMinimal` et `rangPourEtape`
   (`src/lib/occurrences.ts`). Le banc vérifie les formules côté
   TypeScript ; le scénario de base (fichier de test R6) vérifie qu'elles
   donnent les mêmes rangs ici. */

/* L'ordinal d'une étape dans son cycle (1-based), dans l'ordre des positions. */
create or replace function public.ordinal_etape(p_programme uuid, p_etape uuid)
returns integer language sql stable as $$
  select o.n::integer from (
    select id, row_number() over (order by position) as n
    from public.programme_seances where programme_id = p_programme
  ) o where o.id = p_etape
$$;

/* Le premier rang encore proposable : le plancher, ou un tour de cycle
   derrière la plus lointaine occurrence fermée. Au-delà d'un tour, une
   occurrence non faite n'est pas due (décision 35, aucune dette). */
create or replace function public.rang_minimal(p_programme uuid)
returns integer language sql stable as $$
  with k as (select count(*)::integer as n from public.programme_seances where programme_id = p_programme),
       d as (select coalesce(rang_depart, position_initiale, 1) as v from public.programmes where id = p_programme),
       f as (select max(rang) as m from public.intentions_entrainement
             where programme_id = p_programme and rang is not null and statut in ('faite', 'passee'))
  select greatest(1, (select v from d), coalesce((select m from f) - (select n from k) + 1, 1))
$$;

/* ─────────────── 3. Le déclencheur ─────────────── */

create or replace function public.attribuer_rang()
returns trigger language plpgsql as $$
declare
  k integer;
  ord integer;
  r integer;
begin
  if new.etape_consommee_id is null then
    new.rang := null;
    return new;
  end if;

  /* L'étape a changé et personne n'a donné de nouveau rang : l'ancien ne
     correspond plus, on en recalcule un. */
  if tg_op = 'UPDATE'
     and new.etape_consommee_id is distinct from old.etape_consommee_id
     and new.rang is not distinct from old.rang then
    new.rang := null;
  end if;

  /* Deux fermetures simultanées du même programme ne doivent pas tomber
     sur le même rang libre : on les sérialise, pour cette transaction
     seulement. */
  perform pg_advisory_xact_lock(hashtextextended(new.programme_id::text, 6));

  select count(*) into k from public.programme_seances where programme_id = new.programme_id;
  ord := public.ordinal_etape(new.programme_id, new.etape_consommee_id);
  if k = 0 or ord is null then
    raise exception 'occurrence_sans_cycle' using errcode = '23514';
  end if;

  if new.rang is not null then
    if ((new.rang - 1) % k) + 1 <> ord then
      raise exception 'occurrence_incoherente: le rang % ne correspond pas à cette étape', new.rang
        using errcode = '23514';
    end if;
    return new;
  end if;

  r := public.rang_minimal(new.programme_id);
  r := r + (((ord - r) % k) + k) % k;
  while exists (
    select 1 from public.intentions_entrainement
    where programme_id = new.programme_id and rang = r
      and id is distinct from new.id
  ) loop
    r := r + k;
  end loop;
  new.rang := r;
  return new;
end $$;

/* ─────────────── 5. La reprise de l'existant ───────────────

   AVANT le déclencheur : la reprise donne des rangs explicites, calculés
   comme l'ancien curseur les voyait. Un passage de rang « vers l'avant »
   par ligne fermée, dans l'ordre de `consommee_le` : une étape dont
   l'ordinal ne dépasse pas celui de la précédente ouvre un nouveau tour.
   Le départ simule une fermeture juste avant `position_initiale`.

   Seules les lignes encore SANS rang sont touchées : rejouer la
   migration ne réécrit rien. */
do $$
declare
  p record;
  l record;
  k integer;
  ord integer;
  dernier_ord integer;
  tour integer;
  dernier_rang integer;
begin
  for p in select id, coalesce(position_initiale, 1) as pi, rang_depart from public.programmes loop
    select count(*) into k from public.programme_seances where programme_id = p.id;
    continue when k = 0;

    /* Déjà repris (migration rejouée) : on ne recommence pas. */
    continue when p.rang_depart is not null;

    dernier_ord := least(greatest(p.pi, 1), k) - 1;
    tour := 1;
    dernier_rang := null;

    for l in
      select i.id, i.etape_consommee_id
      from public.intentions_entrainement i
      where i.programme_id = p.id and i.etape_consommee_id is not null
        and i.statut in ('faite', 'passee')
      order by i.consommee_le nulls last, i.created_at, i.id
    loop
      ord := public.ordinal_etape(p.id, l.etape_consommee_id);
      if ord <= dernier_ord then tour := tour + 1; end if;
      dernier_ord := ord;
      dernier_rang := (tour - 1) * k + ord;
      update public.intentions_entrainement set rang = dernier_rang where id = l.id and rang is null;
    end loop;

    /* Le plancher : l'occurrence que l'ancien curseur proposait. */
    update public.programmes
      set rang_depart = coalesce(dernier_rang + 1, least(greatest(p.pi, 1), k))
      where id = p.id;
  end loop;
end $$;

/* Le déclencheur, maintenant que l'existant a ses rangs. */
drop trigger if exists intentions_attribuer_rang on public.intentions_entrainement;
create trigger intentions_attribuer_rang
  before insert or update of etape_consommee_id, rang, programme_id
  on public.intentions_entrainement
  for each row execute function public.attribuer_rang();

/* Les réservations en cours : le déclencheur leur donne la première
   occurrence libre de leur étape au-dessus du plancher. Elles restent
   prévues, à leur date. */
update public.intentions_entrainement
  set rang = null
  where etape_consommee_id is not null and rang is null and statut = 'prevue';

/* Les lignes portant une étape qui n'ont toujours pas de rang : statut
   inattendu, ou programme sans cycle. On les nomme au lieu de les
   deviner ; la contrainte ci-dessous refuserait la migration. */
do $$
declare n integer;
begin
  select count(*) into n from public.intentions_entrainement
    where etape_consommee_id is not null and rang is null;
  if n > 0 then
    raise exception 'r6_reprise_incomplete: % ligne(s) portent une étape sans rang', n;
  end if;
end $$;

/* ─────────────── 4. Les invariants ─────────────── */

do $$ begin
  alter table public.intentions_entrainement
    add constraint intentions_rang_si_etape check ((etape_consommee_id is null) = (rang is null));
exception when duplicate_object then null; end $$;

create unique index if not exists uniq_occurrence
  on public.intentions_entrainement (programme_id, rang)
  where rang is not null;
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
  out := out || format('M1 sens=%s (%s lignes) ; ', t = (select e_avant from r6_avant) and n = (select n_avant from r6_avant), n);

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
  exception when others then
    out := out || 'refus=' || sqlstate;
  end;

  raise exception 'R6_SCENARIOS %', out;
end $r6$;

rollback;
