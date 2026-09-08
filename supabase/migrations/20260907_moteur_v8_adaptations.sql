/* ════════════════════════════════════════════════════════════════════
   V8 · LES ADAPTATIONS TEMPORAIRES, PREMIÈRE CAPACITÉ

   Additive : une table neuve, une colonne neuve sur les intentions, et
   un correctif d'une seconde sur `programmes`. Aucune ligne n'est créée,
   personne n'a d'adaptation, donc l'app se comporte exactement comme
   avant. Rejouable.

   ⚠️ UNE ADAPTATION EST UNE COUCHE DATÉE, ET ELLE NE MODIFIE JAMAIS LE
   PROGRAMME DE RÉFÉRENCE. Elle est LUE à la matérialisation, elle
   n'écrit rien dans `programmes` ni dans `programme_seances`, et sa fin
   ne demande donc aucune écriture de « retour au programme » : il n'a
   jamais bougé. C'est ce qui la distingue d'une nouvelle version de
   programme, qui, elle, archive et recrée.

   ⚠️ V8 N'OUVRE QU'UN SEUL AXE : `eviter_etapes`. Le vocabulaire est
   FERMÉ et VERSIONNÉ, et une clé inconnue est REFUSÉE à l'écriture,
   jamais ignorée. Un JSONB libre laisserait écrire une adaptation
   confirmée, affichée, et sans le moindre effet : c'est le pire mode
   d'échec possible pour cette vague. On n'écrit donc que ce qu'un moteur
   applique réellement.

   ⚠️ « ÉVITER » N'EST PAS « SAUTER ». Une étape évitée est MASQUÉE le
   temps de l'adaptation : aucune intention `passee` n'est créée, aucun
   `consommee_le` n'est écrit, le curseur ne bouge pas, et l'historique
   ne dit jamais qu'une séance a été faite ou sautée alors qu'elle ne
   l'a pas été. `etapeSuivante()` traverse simplement le cycle jusqu'à la
   prochaine étape non masquée. Le jour où un vrai « saut » existera, ce
   sera une action explicite, et elle consommera réellement une étape.
   ════════════════════════════════════════════════════════════════════ */

/* ⚠️ `btree_gist` EST NÉCESSAIRE ET N'EST PAS INSTALLÉE. Sans elle, un
   EXCLUDE ne peut pas mélanger une égalité sur `user_id` (uuid) et un
   chevauchement de plages : GiST ne sait pas indexer un uuid par défaut.
   Supabase range ses extensions dans `extensions`. */
create extension if not exists btree_gist with schema extensions;

/* ─────────────── 1. La couche datée ─────────────── */

create table if not exists public.adaptations_entrainement (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,

  /* ⚠️ ELLE DÉCLARE LE PROGRAMME AUQUEL ELLE S'APPLIQUE, ET C'EST CE QUI
     L'EMPÊCHE DE SURVIVRE À UNE NOUVELLE VERSION. Une adaptation
     s'exprime en étapes d'un cycle précis ; la porter sur le seul
     `user_id` la ferait glisser en silence sur le programme suivant,
     dont les étapes n'ont ni les mêmes identifiants ni le même sens. La
     lecture filtre sur le programme ACTIF : quand il change, la couche
     cesse de s'appliquer d'elle-même, sans une écriture. */
  programme_id   uuid not null references public.programmes(id) on delete cascade,

  debut          date not null,
  /* ⚠️ `fin` EST OBLIGATOIRE. « Jusqu'à nouvel ordre » n'existe pas :
     l'écran propose une réévaluation à quatre semaines, et un changement
     qui doit devenir définitif n'est plus une adaptation, c'est une
     nouvelle version du programme. Une adaptation sans fin est une
     modification permanente qui ne dit pas son nom. */
  fin            date not null,

  statut         text not null default 'active',
  /* Purement descriptif, écrit par la personne, JAMAIS lu comme de la
     logique métier. Le moteur ne connaît que les axes. */
  motif          text,

  axes           jsonb not null,
  axes_version   int  not null default 1,
  origine        text not null default 'utilisateur',

  cree_le        timestamptz not null default now(),
  maj_le         timestamptz not null default now(),
  fermee_le      timestamptz,

  constraint adaptations_periode_check check (fin >= debut),
  constraint adaptations_statut_check  check (statut  in ('active', 'terminee', 'annulee')),
  constraint adaptations_origine_check check (origine in ('systeme', 'utilisateur', 'guide')),
  /* Le miroir de `programmes_archive_check` : l'état et sa date ne
     peuvent pas se contredire. */
  constraint adaptations_fermeture_check check ((statut = 'active') = (fermee_le is null))
);

/* ─────────────── 2. Le vocabulaire fermé ───────────────
   ⚠️ DEUX BARRIÈRES, PAS UNE. Celle-ci refuse la FORME (clé inconnue,
   tableau vide, doublon) et elle est `immutable`, donc utilisable dans un
   CHECK. Le trigger du dessous refuse le SENS (une étape qui
   n'appartient pas au programme déclaré), parce que ça demande une
   lecture et qu'une lecture n'est pas immuable. La validation TypeScript
   fait la même chose avant l'appel : la base est le dernier mot, pas le
   seul.                                                                 */
create or replace function public.adaptation_axes_valides(p_axes jsonb, p_version int)
returns boolean
language sql immutable as $fn$
  select
       p_version = 1
   and jsonb_typeof(p_axes) = 'object'
   /* Aucune clé hors du vocabulaire de cette version. */
   and not exists (
         select 1 from jsonb_object_keys(p_axes) k
          where k not in ('eviter_etapes')
       )
   /* L'axe existe, c'est un tableau de chaînes, non vide, sans doublon. */
   and jsonb_typeof(p_axes -> 'eviter_etapes') = 'array'
   and jsonb_array_length(p_axes -> 'eviter_etapes') > 0
   and not exists (
         select 1 from jsonb_array_elements(p_axes -> 'eviter_etapes') e
          where jsonb_typeof(e) <> 'string'
       )
   and (
         select count(*) = count(distinct e)
           from jsonb_array_elements_text(p_axes -> 'eviter_etapes') e
       );
$fn$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'adaptations_axes_check') then
    alter table public.adaptations_entrainement
      add constraint adaptations_axes_check
      check (public.adaptation_axes_valides(axes, axes_version));
  end if;
end $$;

/* Le SENS : les étapes évitées appartiennent bien au programme déclaré,
   et ce programme appartient bien à la personne. Une adaptation qui
   nomme l'étape de quelqu'un d'autre, ou d'un autre cycle, serait
   confirmée, affichée, et sans effet. */
create or replace function public.valider_adaptation()
returns trigger language plpgsql as $fn$
declare
  v_proprietaire uuid;
  v_statut       text;
  v_inconnues    int;
begin
  select p.user_id, p.statut into v_proprietaire, v_statut
    from public.programmes p where p.id = new.programme_id;

  if v_proprietaire is null or v_proprietaire <> new.user_id then
    raise exception 'adaptation : ce programme n''appartient pas a cette personne';
  end if;

  /* ⚠️ Seulement sur une adaptation ACTIVE : une adaptation terminée
     doit pouvoir survivre à l'archivage de son programme, sinon on
     perdrait l'historique en changeant de version. */
  if new.statut = 'active' and v_statut <> 'actif' then
    raise exception 'adaptation : le programme vise n''est pas le programme actif';
  end if;

  select count(*) into v_inconnues
    from jsonb_array_elements_text(new.axes -> 'eviter_etapes') e
   where not exists (
     select 1 from public.programme_seances s
      where s.id = e::uuid and s.programme_id = new.programme_id
   );

  if v_inconnues > 0 then
    raise exception 'adaptation : % etape(s) hors du programme declare', v_inconnues;
  end if;

  return new;
end $fn$;

drop trigger if exists trg_valider_adaptation on public.adaptations_entrainement;
create trigger trg_valider_adaptation
  before insert or update on public.adaptations_entrainement
  for each row execute function public.valider_adaptation();

create or replace function public.touch_adaptation()
returns trigger language plpgsql as $fn$
begin
  new.maj_le := now();
  return new;
end $fn$;

drop trigger if exists trg_touch_adaptation on public.adaptations_entrainement;
create trigger trg_touch_adaptation
  before update on public.adaptations_entrainement
  for each row execute function public.touch_adaptation();

/* ─────────────── 3. Une seule adaptation active à la fois ───────────────
   ⚠️ LA PLAGE EST INCLUSIVE DES DEUX CÔTÉS (`'[]'`), ET C'EST LA SEULE
   LECTURE JUSTE D'UNE PÉRIODE ÉCRITE EN JOURS. Une adaptation qui finit
   le 17 et une autre qui commence le 18 ne se chevauchent pas et sont
   toutes deux acceptées ; deux adaptations qui partagent réellement une
   journée sont refusées. Avec la borne haute exclusive de PostgreSQL par
   défaut, le dernier jour d'une adaptation cesserait d'être protégé.

   ⚠️ ET C'EST LA BASE QUI LE TIENT, PAS LE CHEMIN D'ÉCRITURE. Une
   demande qui chevauche l'adaptation en cours propose de LA MODIFIER,
   jamais d'en créer une seconde.                                        */
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'adaptations_sans_chevauchement') then
    alter table public.adaptations_entrainement
      add constraint adaptations_sans_chevauchement
      exclude using gist (
        user_id with =,
        daterange(debut, fin, '[]') with &&
      ) where (statut = 'active');
  end if;
end $$;

create index if not exists idx_adaptations_actives
    on public.adaptations_entrainement (user_id, programme_id, debut)
 where statut = 'active';

/* ─────────────── 4. RLS ─────────────── */

alter table public.adaptations_entrainement enable row level security;

drop policy if exists "adaptations: owner full access" on public.adaptations_entrainement;
create policy "adaptations: owner full access"
  on public.adaptations_entrainement for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

/* ─────────────── 5. La trace sur l'intention ───────────────
   ⚠️ ELLE TRACE, ELLE NE DÉCIDE RIEN. Elle dit qu'une intention a été
   matérialisée pendant une adaptation ; elle n'est jamais lue pour
   savoir quoi proposer, et aucune intention ancienne n'est
   rétro-étiquetée parce que sa date tombe dans la période. `ON DELETE
   SET NULL` : supprimer une adaptation ne détruit aucune intention, et
   surtout ne réécrit aucun fait.                                        */
alter table public.intentions_entrainement
  add column if not exists adaptation_id uuid
  references public.adaptations_entrainement(id) on delete set null;

/* ─────────────── 6. Le correctif au passage ───────────────
   ⚠️ `position_initiale` VAUT 0 PAR DÉFAUT ALORS QUE LES POSITIONS DU
   CYCLE COMMENCENT À 1. Aucune ligne n'en souffre aujourd'hui : le seul
   écrivain (`getOrCreateProgramme`) pose explicitement 1. Mais un second
   écrivain (la future nouvelle version d'un programme) qui oublierait la
   colonne obtiendrait un curseur de report qui ne désigne aucune étape,
   et `etapeSuivante` retomberait silencieusement sur la première du
   cycle. Un piège qui n'attend qu'un appelant. */
alter table public.programmes alter column position_initiale set default 1;

/* ─────────────── ROLLBACK ───────────────

   Additive, donc entièrement réversible tant qu'aucune adaptation n'a
   été déclarée. La requête qui le dit :

     select count(*) from public.adaptations_entrainement;

   Si elle rend 0, le retour arrière complet, dans cet ordre :

     alter table public.intentions_entrainement drop column if exists adaptation_id;
     drop table if exists public.adaptations_entrainement;
     drop function if exists public.valider_adaptation();
     drop function if exists public.touch_adaptation();
     drop function if exists public.adaptation_axes_valides(jsonb, int);
     alter table public.programmes alter column position_initiale set default 0;

   Si elle rend autre chose, `drop table` emporte les adaptations et
   remet `adaptation_id` à null sur les intentions qui les citaient (leur
   contenu et leur statut ne bougent pas : la colonne ne porte qu'une
   trace). Le code, lui, se comporte comme avant la vague dès que la
   table disparaît : chaque lecture d'adaptation échoue et rend « aucune
   adaptation ».

   ÉTAT DE RÉFÉRENCE, PRIS AVANT ÉCRITURE :
     0 adaptation · 3 programmes (3 actifs) · 15 étapes de cycle
     btree_gist disponible en 1.7, non installée
*/
