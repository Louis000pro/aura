-- ════════════════════════════════════════════════════════════════════
-- Messages vocaux dans les conversations (2026-10-22).
--
-- Un message vocal est un `type = 'audio'` : le fichier vit dans le même
-- bucket privé que les photos (`conversation-media`, URL signée 1 h,
-- lisible par les seuls membres), au chemin <conversation>/<auteur>/…
--
-- Pas de colonne neuve : pour un vocal, `media_width` porte la DURÉE en
-- secondes (1 à 60) et `media_height` reste nulle. Une minute au plus,
-- encodée à 32 kbit/s : environ 240 Ko, donc le coût en stockage et en
-- bande passante reste négligeable.
-- Rejouable.
-- ════════════════════════════════════════════════════════════════════

alter table public.messages drop constraint if exists messages_type_check;
alter table public.messages add constraint messages_type_check
  check (type = any (array['texte','systeme','image','audio']));

alter table public.messages drop constraint if exists messages_media_check;
alter table public.messages add constraint messages_media_check check (
  (type = 'image' and media_path is not null
     and media_width between 1 and 4096 and media_height between 1 and 4096)
  or (type = 'audio' and media_path is not null
     and media_width between 1 and 60 and media_height is null)
  or (type not in ('image','audio') and media_path is null
     and media_width is null and media_height is null)
);

drop policy if exists "envoi par membres" on public.messages;
create policy "envoi par membres" on public.messages for insert with check (
  auth.uid() = user_id
  and est_membre_conversation(conversation_id, auth.uid())
  and peut_ecrire_dans(conversation_id)
  and (repond_a is null or exists (
    select 1 from public.messages original
    where original.id = messages.repond_a and original.conversation_id = messages.conversation_id))
  and (
    (type = 'texte' and media_path is null
       and length(btrim(contenu)) between 1 and 4000)
    or (type = 'image' and contenu = any (array['Photo','Affiche de séance'])
       and media_path like conversation_id::text || '/' || auth.uid()::text || '/%')
    or (type = 'audio' and contenu = 'Message vocal'
       and media_path like conversation_id::text || '/' || auth.uid()::text || '/%')
  )
);

update storage.buckets
   set allowed_mime_types = array[
     'image/jpeg','image/png','image/webp',
     'audio/mp4','audio/aac','audio/webm','audio/ogg','audio/mpeg'
   ]
 where id = 'conversation-media';
