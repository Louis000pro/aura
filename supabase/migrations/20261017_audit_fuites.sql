-- ═══════════════════════════════════════════════════════════════════════
-- Audit de conformité du 2026-10-17 · lot 1 : les fuites en base
--
-- Les policies RLS s'ADDITIONNENT : une seule policy `USING (true)` annule
-- toutes les autres. C'est ce qui rendait lisibles par n'importe qui, sans
-- compte, les posts privés et réservés aux amis. Rejouable.
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Posts : la policy qui ouvrait tout. `posts_select` reste et dit déjà
--    la règle (public, à moi, ou à mes amis).
drop policy if exists "Posts publics visibles par tous" on public.posts;

-- 2. Le graphe d'amitié : lisible par les comptes connectés, plus par
--    n'importe qui sur Internet.
drop policy if exists "Abonnements visibles par tous" on public.followers;
drop policy if exists "followers lisibles par les connectes" on public.followers;
create policy "followers lisibles par les connectes" on public.followers
  for select to authenticated using (true);

-- 3. Badges : faits pour se voir, mais entre comptes connectés.
drop policy if exists "badges visibles par tous" on public.profile_badges;
drop policy if exists "badges visibles par les connectes" on public.profile_badges;
create policy "badges visibles par les connectes" on public.profile_badges
  for select to authenticated using (true);

-- 4. Tables du social dormant (stories, commentaires, likes, saison) :
--    plus personne ne les lit, mais elles gardent des données. On ne les
--    vide pas : on les referme sur leur propriétaire.
drop policy if exists "Stories visibles par tous" on public.stories;
drop policy if exists "Read active stories" on public.stories;
drop policy if exists "stories du proprietaire" on public.stories;
create policy "stories du proprietaire" on public.stories
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "highlights_select" on public.highlights;
drop policy if exists "highlights du proprietaire" on public.highlights;
create policy "highlights du proprietaire" on public.highlights
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "highlight_items_select" on public.highlight_items;

drop policy if exists "Commentaires visibles par tous" on public.post_comments;
drop policy if exists "comments_select" on public.post_comments;
drop policy if exists "commentaires du proprietaire" on public.post_comments;
create policy "commentaires du proprietaire" on public.post_comments
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Likes visibles par tous" on public.post_likes;
drop policy if exists "likes_select" on public.post_likes;
drop policy if exists "likes du proprietaire" on public.post_likes;
create policy "likes du proprietaire" on public.post_likes
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Reposts visibles par tous" on public.post_reposts;
drop policy if exists "reposts du proprietaire" on public.post_reposts;
create policy "reposts du proprietaire" on public.post_reposts
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "eclat_events: read all" on public.eclat_events;
drop policy if exists "eclat_events: own read" on public.eclat_events;
create policy "eclat_events: own read" on public.eclat_events
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "exploit_completions: read all" on public.exploit_completions;
drop policy if exists "exploit_completions: own read" on public.exploit_completions;
create policy "exploit_completions: own read" on public.exploit_completions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "season_camps: read all" on public.season_camps;
drop policy if exists "season_camps: own read" on public.season_camps;
create policy "season_camps: own read" on public.season_camps
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "community_events: read all" on public.community_events;
drop policy if exists "community_events: own read" on public.community_events;
create policy "community_events: own read" on public.community_events
  for select to authenticated using (auth.uid() = actor_id);

-- 5. Notifications : plus aucune écriture depuis le navigateur. Toutes les
--    notifications naissent côté serveur (clé service). Avant, n'importe
--    quel compte pouvait en déposer chez n'importe qui avec un lien libre,
--    c'est-à-dire de l'hameçonnage signé Vaiiya.
drop policy if exists "Notifs creees par l emetteur" on public.notifications;
drop policy if exists "Créer une notif" on public.notifications;
drop policy if exists "insert notifications" on public.notifications;
revoke insert on public.notifications from anon, authenticated;

-- 6. Le nom complet (souvent le vrai nom venu de Google) devient privé :
--    on le lit chez soi par `mon_profil`, plus chez les autres.
revoke select (full_name) on public.profiles from authenticated, anon;

-- 7. Fonctions SECURITY DEFINER exécutables par `anon` : elles passent aux
--    seuls comptes connectés. `apercu_invitation` reste publique (la page
--    /rejoindre s'affiche sans compte). Celles qui étaient déjà réservées
--    au service ne sont pas touchées.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and has_function_privilege('anon', p.oid, 'execute')
      and p.proname <> 'apercu_invitation'
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated, service_role', f.sig);
  end loop;
end $$;

-- 8. search_path figé sur les fonctions qui ne le fixaient pas.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and (p.proconfig is null
           or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'))
  loop
    execute format('alter function %s set search_path = public', f.sig);
  end loop;
end $$;

-- 9. Avatars : les URL publiques continuent de marcher (bucket public),
--    mais on ne peut plus LISTER le bucket, et seules des images de 5 Mo
--    au plus y entrent.
drop policy if exists "Allow read all avatars" on storage.objects;
drop policy if exists "avatars_public_read" on storage.objects;
-- Chacun garde la lecture de son propre dossier : un `upsert` de Storage
-- (remplacer sa photo) en a besoin.
drop policy if exists "avatars lus dans son dossier" on storage.objects;
create policy "avatars lus dans son dossier" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/avif']
 where id = 'avatars';
