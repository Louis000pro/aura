-- ════════════════════════════════════════════════════════════════════
-- Entraînement repensé · ce qui manquait aux lots 2 et 3
--
-- 1. Trois situations de plus : un événement, un autre sport, des jours
--    qui changent un moment. Même règle : un vocabulaire fermé par genre.
-- 2. « Seulement ce jour-là » sur une séance déjà réservée : la base
--    remplace ses exercices en une transaction, ou ne change rien.
--
-- Rejouable. Après 20261119_situations.sql et 20261012_revue_finale.sql.
-- ════════════════════════════════════════════════════════════════════

/* Des jours de la semaine : 1 à 7 entiers, de 1 à 7, sans doublon. */
create or replace function public.jours_semaine_valides(j jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case when jsonb_typeof(j) is distinct from 'array' then false
    else jsonb_array_length(j) between 1 and 7
     and not exists (select 1 from jsonb_array_elements(j) e where e.value::text !~ '^[1-7]$')
     and (select count(distinct e.value) from jsonb_array_elements(j) e) = jsonb_array_length(j)
  end;
$$;

alter table public.situations drop constraint if exists situations_genre;
alter table public.situations add constraint situations_genre
  check (genre in ('moins_de_temps', 'gene', 'energie', 'materiel', 'evenement', 'autre_sport', 'jours_moment'));

alter table public.situations drop constraint if exists situations_reglages;
alter table public.situations add constraint situations_reglages check (jsonb_typeof(reglages) = 'object' and (
    (genre = 'moins_de_temps'
      and reglages ?& array['minutes']
      and (reglages - array['minutes']) = '{}'::jsonb
      and jsonb_typeof(reglages->'minutes') = 'number'
      and (reglages->>'minutes')::int between 10 and 90)
    or (genre = 'gene'
      and reglages ?& array['zones', 'mode']
      and (reglages - array['zones', 'mode', 'choix', 'pauses']) = '{}'::jsonb
      and jsonb_typeof(reglages->'zones') = 'array'
      and jsonb_array_length(reglages->'zones') between 1 and 39
      and reglages->>'mode' in ('eviter', 'alleger', 'un')
      and (not reglages ? 'choix' or jsonb_typeof(reglages->'choix') = 'object')
      and (not reglages ? 'pauses' or jsonb_typeof(reglages->'pauses') = 'object'))
    or (genre = 'energie'
      and reglages ?& array['mode']
      and (reglages - array['mode']) = '{}'::jsonb
      and reglages->>'mode' in ('leger', 'pause'))
    or (genre = 'materiel'
      and reglages ?& array['lieu']
      and (reglages - array['lieu']) = '{}'::jsonb
      and reglages->>'lieu' in ('poids', 'halteres'))
    or (genre = 'evenement' and reglages = '{}'::jsonb and fin - debut <= 1)
    or (genre in ('autre_sport', 'jours_moment')
      and (reglages - array['jours']) = '{}'::jsonb
      and coalesce(public.jours_semaine_valides(reglages->'jours'), false))
  ));


/* « Seulement ce jour-là », sur une réservation. La réservation montrée
   doit être encore là, à son jour, avec son rang et son étape : sinon
   `changee`, et rien n'est écrit. */
create or replace function public.modifier_occurrence(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id   uuid := nullif(p->>'id', '')::uuid;
  r      public.intentions_entrainement;
  v_res  jsonb;
begin
  if v_user is null then raise exception 'non_connecte' using errcode = '28000'; end if;
  if jsonb_typeof(p->'lignes') is distinct from 'array' then
    raise exception 'lignes_invalides' using errcode = '22023';
  end if;
  select * into r from public.intentions_entrainement
   where id = v_id and user_id = v_user and statut = 'prevue'
   for update;
  if not found
     or r.date is distinct from nullif(p->>'date', '')::date
     or r.programme_id is distinct from nullif(p->>'programme_id', '')::uuid
     or r.etape_consommee_id is distinct from nullif(p->>'etape_id', '')::uuid
     or r.rang is distinct from nullif(p->>'rang', '')::integer
     or r.programme_id is null or r.etape_consommee_id is null or r.rang is null then
    return jsonb_build_object('resultat', 'changee');
  end if;

  delete from public.intentions_entrainement where id = r.id;
  v_res := public.ecrire_occurrence(jsonb_build_object(
    'intention', jsonb_build_object(
      'programme_id', r.programme_id,
      'etape_consommee_id', r.etape_consommee_id,
      'programme_seance_id', r.etape_consommee_id,
      'rang', r.rang,
      'statut', 'prevue',
      'date', r.date,
      'type', r.type,
      'title', r.title,
      'difficulty', r.difficulty,
      'location', r.location,
      'origine', 'utilisateur',
      'adaptation_id', r.adaptation_id
    ),
    'modele_id', null,
    'lignes', p->'lignes'
  ));
  if v_res->>'resultat' is distinct from 'ok' then
    raise exception 'modification_impossible: %', v_res using errcode = '23505';
  end if;
  return v_res;
end;
$$;

revoke all on function public.modifier_occurrence(jsonb) from public, anon;
grant execute on function public.modifier_occurrence(jsonb) to authenticated;
