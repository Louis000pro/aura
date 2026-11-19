/* ════════════════════════════════════════════════════════════════════
   ENTRAÎNEMENT · LOT 3 · « PROGRAMME » : LES VERSIONS ET LES RÈGLES

   Rejouable. À coller APRÈS `20261012_revue_finale.sql` et
   `20261119_situations.sql`.

   1. Trois règles de plus sur `contexte_entrainement` (la variété y vit
      déjà depuis R7) : la rotation lourd / volume / endurance, la
      proposition de monter, le signal « zone travaillée la veille ».
   2. `programme_versions` : le journal de ce qu'on change dans son
      programme. Chaque ligne garde ce qui était là AVANT, pour pouvoir y
      revenir. Rien ne s'y efface : revenir écrit une ligne de plus.
   3. `modifier_modele` : réécrit les exercices d'une séance du cycle
      (« à chaque fois ») et note la version dans la même transaction.
      `ecrire_modele` ne fait que créer un modèle absent ; celle-ci
      remplace ses lignes.
   4. `annuler_version` : marque une version comme annulée et note le
      retour, dans la même transaction (le client a d'abord remis l'état
      d'avant avec les écritures habituelles).
   ════════════════════════════════════════════════════════════════════ */

/* ─────────────── 1. Les règles ─────────────── */

alter table public.contexte_entrainement add column if not exists rotation text not null default 'alterner';
alter table public.contexte_entrainement add column if not exists hausse   text not null default 'proposer';
alter table public.contexte_entrainement add column if not exists prevenir boolean not null default true;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'contexte_rotation_check') then
    alter table public.contexte_entrainement
      add constraint contexte_rotation_check check (rotation in ('alterner', 'garder'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'contexte_hausse_check') then
    alter table public.contexte_entrainement
      add constraint contexte_hausse_check check (hausse in ('proposer', 'rien'));
  end if;
end $$;


/* ─────────────── 2. Le journal des versions ─────────────── */

create table if not exists public.programme_versions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  programme_id uuid references public.programmes(id) on delete set null,
  genre        text not null check (genre in ('nom', 'jours', 'duree', 'lieu', 'regle', 'seance', 'retour')),
  texte        text not null check (length(texte) between 1 and 200),
  auteur       text not null default 'toi' check (auteur in ('toi', 'guide')),
  avant        jsonb,
  apres        jsonb,
  cree_le      timestamptz not null default now(),
  annulee_le   timestamptz,
  /* Un retour désigne la version qu'il annule. */
  retour_de    uuid references public.programme_versions(id) on delete set null
);

create index if not exists idx_programme_versions_user on public.programme_versions (user_id, cree_le desc);

alter table public.programme_versions enable row level security;

drop policy if exists "programme_versions: owner lit" on public.programme_versions;
create policy "programme_versions: owner lit" on public.programme_versions
  for select using (auth.uid() = user_id);

drop policy if exists "programme_versions: owner ecrit" on public.programme_versions;
create policy "programme_versions: owner ecrit" on public.programme_versions
  for insert with check (auth.uid() = user_id and genre <> 'retour' and annulee_le is null and retour_de is null);

/* Pas d'UPDATE ni de DELETE depuis le navigateur : une version ne
   s'annule que par `annuler_version`, et rien ne s'efface. */
revoke update, delete on public.programme_versions from anon, authenticated;
revoke all on public.programme_versions from anon;


/* ─────────────── 3. Réécrire une séance du cycle ─────────────── */

create or replace function public.modifier_modele(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user      uuid := auth.uid();
  v_etape     uuid := nullif(p->>'programme_seance_id', '')::uuid;
  v_lieu      text := p->>'lieu';
  v_programme uuid;
  v_modele    uuid;
  v_avant     jsonb;
  v_version   uuid;
  v_retour    uuid := nullif(p->>'retour_de', '')::uuid;
begin
  if v_user is null then raise exception 'non_connecte' using errcode = '28000'; end if;

  select ps.programme_id into v_programme
    from public.programme_seances ps join public.programmes pr on pr.id = ps.programme_id
   where ps.id = v_etape and pr.user_id = v_user;
  if v_programme is null then raise exception 'etape_inconnue' using errcode = '42501'; end if;

  if v_lieu is null or v_lieu not in ('salle', 'halteres', 'poids') then
    raise exception 'lieu_invalide' using errcode = '22023';
  end if;
  if jsonb_typeof(p->'lignes') <> 'array'
     or jsonb_array_length(p->'lignes') = 0
     or jsonb_array_length(p->'lignes') > 12 then
    raise exception 'lignes_invalides' using errcode = '22023';
  end if;
  if length(coalesce(p->>'texte', '')) not between 1 and 200 then
    raise exception 'texte_invalide' using errcode = '22023';
  end if;

  /* Le retour vise une version de ce compte, encore active. */
  if v_retour is not null and not exists (
    select 1 from public.programme_versions
     where id = v_retour and user_id = v_user and annulee_le is null and genre = 'seance'
  ) then
    raise exception 'version_inconnue' using errcode = '42501';
  end if;

  /* Le modèle, créé s'il n'existe pas encore. */
  insert into public.etape_modeles (programme_seance_id, lieu, orientation, niveau, composition_version)
  values (v_etape, v_lieu, coalesce(p->>'orientation', 'general'), nullif(p->>'niveau', ''), coalesce((p->>'version')::smallint, 2))
  on conflict (programme_seance_id, lieu) do nothing;
  select id into v_modele from public.etape_modeles where programme_seance_id = v_etape and lieu = v_lieu;

  /* Ce qui était là avant : ses lignes écrites, sinon celles que l'app
     composait en mémoire (envoyées par le client). */
  select coalesce(jsonb_agg(to_jsonb(e) - 'id' - 'modele_id' order by e.emplacement), '[]'::jsonb)
    into v_avant
    from public.etape_exercices e where e.modele_id = v_modele;
  if jsonb_array_length(v_avant) = 0 then v_avant := coalesce(p->'avant', '[]'::jsonb); end if;

  delete from public.etape_exercices where modele_id = v_modele;
  insert into public.etape_exercices (
    modele_id, emplacement, exercice_cle, exercice_nom, fonction, statut, series, mesure,
    reps_min, reps_max, reps_cible, duree_s, repos_s, transition_s, charge_type, unite
  )
  select v_modele, l.emplacement, l.exercice_cle, left(l.exercice_nom, 120), l.fonction, l.statut, l.series, l.mesure,
         l.reps_min, l.reps_max, l.reps_cible, l.duree_s, l.repos_s, l.transition_s, l.charge_type, coalesce(l.unite, '')
    from jsonb_to_recordset(p->'lignes') as l(
      emplacement smallint, exercice_cle text, exercice_nom text, fonction text, statut text,
      series smallint, mesure text, reps_min smallint, reps_max smallint, reps_cible smallint,
      duree_s integer, repos_s integer, transition_s integer, charge_type text, unite text
    );

  if v_retour is not null then
    update public.programme_versions set annulee_le = now() where id = v_retour;
  end if;

  insert into public.programme_versions (user_id, programme_id, genre, texte, auteur, avant, apres, retour_de)
  values (
    v_user, v_programme,
    case when v_retour is null then 'seance' else 'retour' end,
    left(p->>'texte', 200),
    case when p->>'auteur' = 'guide' then 'guide' else 'toi' end,
    jsonb_build_object('etape', v_etape, 'lieu', v_lieu, 'lignes', v_avant),
    jsonb_build_object('etape', v_etape, 'lieu', v_lieu, 'lignes', p->'lignes'),
    v_retour
  )
  returning id into v_version;

  return jsonb_build_object('modele_id', v_modele, 'version_id', v_version);
end;
$$;

revoke all on function public.modifier_modele(jsonb) from public, anon;
grant execute on function public.modifier_modele(jsonb) to authenticated;


/* ─────────────── 4. Revenir à la version d'avant ─────────────── */

create or replace function public.annuler_version(p_id uuid, p_texte text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row  public.programme_versions;
  v_id   uuid;
begin
  if v_user is null then raise exception 'non_connecte' using errcode = '28000'; end if;
  select * into v_row from public.programme_versions
   where id = p_id and user_id = v_user and annulee_le is null and genre not in ('retour', 'seance')
   for update;
  if not found then raise exception 'version_inconnue' using errcode = '42501'; end if;
  if length(coalesce(p_texte, '')) not between 1 and 200 then
    raise exception 'texte_invalide' using errcode = '22023';
  end if;

  update public.programme_versions set annulee_le = now() where id = p_id;
  insert into public.programme_versions (user_id, programme_id, genre, texte, auteur, avant, apres, retour_de)
  values (v_user, v_row.programme_id, 'retour', left(p_texte, 200), 'toi', v_row.apres, v_row.avant, p_id)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.annuler_version(uuid, text) from public, anon;
grant execute on function public.annuler_version(uuid, text) to authenticated;
