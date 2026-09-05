/* ════════════════════════════════════════════════════════════════════
   V6b · LA JOURNÉE PEUT PORTER DEUX SÉANCES

   Une séance principale plus un supplément le même jour est un cas
   normal, et `UNIQUE (user_id, date)` l'interdisait. Elle disparaît.

   ⚠️ ⚠️ C'EST LE POINT DE NON-RETOUR LE PLUS PARTICULIER DU CHANTIER, ET
   IL SE FERME TOUT SEUL. Retirer une contrainte d'unicité se défait tant
   que les données la respectent encore ; dès la PREMIÈRE journée à deux
   séances, on ne peut plus la remettre, parce qu'une contrainte ne
   s'ajoute pas sur des lignes qui la violent. La fenêtre de retour
   arrière ne se referme donc pas à une date qu'on choisit, mais au
   premier geste de la première personne.

   ✅ APPLIQUÉE le 2026-09-05, à 20 h 01 UTC, et dans le bon ordre : la
   production servait déjà le code qui désigne une intention par son `id`
   depuis vingt minutes. L'avertissement qui suit est conservé parce qu'il
   explique POURQUOI cet ordre.

   ⚠️ NE PAS APPLIQUER AVANT QUE LE CODE QUI S'EN PASSE SOIT DÉPLOYÉ
   PARTOUT, PRODUCTION COMPRISE. Même ordre qu'en V6, et pour une raison
   plus dure encore : la production écrivait `on_conflict=user_id,date`,
   et PostgREST exige une contrainte d'unicité SUR LA RELATION pour
   arbitrer un `on_conflict`. Sans elle, ce n'est pas un malentendu comme
   en V6, c'est un refus : toutes les écritures du planning échouent.

   L'ORDRE, ET IL N'EST PAS NÉGOCIABLE :
     1. le code qui désigne une INTENTION par son `id` (et plus une
        journée par sa date) part en production ;
     2. ce fichier ;
     3. rien d'autre. V6b ne touche ni aux adaptations, ni au Guide, ni à
        l'accueil.

   Rejouable : chaque étape se teste avant d'agir.
   ════════════════════════════════════════════════════════════════════ */

/* ─────────────── 1. Un seul repos par date ───────────────

   ⚠️ ELLE SE POSE AVANT LE RETRAIT, ET C'EST TOUT L'INTÉRÊT DE L'ORDRE :
   « un seul repos par date » était tenu EN DOUCE par la contrainte qu'on
   s'apprête à retirer. La retirer d'abord ouvrirait un intervalle, court
   mais réel, où deux repos pourraient s'écrire sur la même journée. On
   remplace la garantie avant de retirer celle qui la portait.

   L'index est partiel : il ne dit rien des séances, dont c'est justement
   la raison d'être de cette vague d'en accepter plusieurs.               */

create unique index if not exists uniq_repos_par_date
    on public.intentions_entrainement (user_id, date)
 where nature = 'repos' and date is not null;

/* ─────────────── 2. La contrainte disparaît ───────────────

   ⚠️ CE QUI RESTE APRÈS ELLE, ET QUI SUFFIT. `idx_intentions_user_date`
   (non unique) porte toujours les lectures par personne et par date, donc
   rien ne ralentit. Et les trois autres invariants tiennent seuls :
   `uniq_intention_non_datee` (une seule intention sans date en attente),
   `uniq_intention_par_etape` (pas de double-réservage d'une étape, les
   suppléments y échappant par leur étape nulle), et l'index ci-dessus.

   ⚠️ CE QUE LA BASE NE PEUT TOUJOURS PAS TENIR, ET QUI RESTE UNE RÈGLE
   D'ÉCRITURE : « un repos et une séance ne coexistent pas à la même
   date ». Un `EXCLUDE` l'imposerait, mais il interdirait du même coup les
   suppléments, c'est à dire exactement ce qu'on ouvre ici. La règle vit
   donc dans `poser()` (src/lib/planning.ts), à l'endroit unique où l'on
   écrit une intention délibérée.                                         */

do $$
declare
  nom text;
begin
  -- Le nom a changé en V6 ; on accepte les deux, la migration reste
  -- rejouable sur une base qui n'aurait pas encore été renommée.
  foreach nom in array array['intentions_user_date_key', 'planning_days_user_id_date_key'] loop
    if exists (
      select 1 from pg_constraint c
        join pg_class t on t.oid = c.conrelid
       where c.conname = nom and t.relname = 'intentions_entrainement'
    ) then
      execute format('alter table public.intentions_entrainement drop constraint %I', nom);
    end if;
  end loop;
end $$;

/* ─────────────── LE POINT DE ROLLBACK ───────────────

   ⚠️ IL N'EST VALABLE QUE TANT QU'AUCUNE DATE NE PORTE DEUX SÉANCES. La
   requête ci-dessous le dit, et c'est elle qu'il faut lire AVANT
   d'espérer revenir en arrière :

     select user_id, date, count(*)
       from public.intentions_entrainement
      where date is not null
      group by user_id, date having count(*) > 1;

   Si elle rend une seule ligne, le retour en arrière est fermé : une
   contrainte d'unicité ne s'ajoute pas sur des données qui la violent, et
   la seule façon de la remettre serait de SUPPRIMER une séance que
   quelqu'un a posée. On ne le fera pas.

   Tant qu'elle est vide, le retour complet tient en deux gestes, dans cet
   ordre (la base d'abord, parce que l'ancien code EXIGE la contrainte
   pour son `on_conflict`) :

     drop index if exists public.uniq_repos_par_date;
     alter table public.intentions_entrainement
       add constraint intentions_user_date_key unique (user_id, date);

   puis, côté code, revenir à `c8ac8dd` (le dernier commit avant V6b).

   ÉTAT DE RÉFÉRENCE PRIS JUSTE AVANT L'APPLICATION :
     244 lignes · empreinte md5 ba2a890b373a31cdf0e88c82e94b9f1c
     (235 prevue · 9 faite · 0 passee · 2 repos · 25 comptes)
*/
