-- ─────────────────────────────────────────────────────────────────────
-- MODIFIER SES PROPRES MESSAGES (2026-10-23, demande de Louis).
--
-- Un message TEXTE peut être corrigé par son auteur, et seulement lui.
-- Le reste de la ligne ne bouge jamais : le droit UPDATE n'est accordé
-- que sur `contenu`, et `modifie_le` est posée par le trigger, jamais
-- par le navigateur. Une photo ou un vocal ne se modifie pas (on le
-- supprime). Rejouable.
-- ─────────────────────────────────────────────────────────────────────

alter table public.messages add column if not exists modifie_le timestamptz;

-- Le navigateur ne peut toucher qu'à une colonne.
revoke update on public.messages from anon, authenticated;
grant update (contenu) on public.messages to authenticated;

drop policy if exists "modification de ses propres messages" on public.messages;
create policy "modification de ses propres messages" on public.messages
  for update to authenticated
  using (auth.uid() = user_id and type = 'texte')
  with check (
    auth.uid() = user_id and type = 'texte'
    and length(btrim(contenu)) between 1 and 4000
  );

create or replace function public.marquer_message_modifie()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.contenu is distinct from old.contenu then
    new.modifie_le := now();
  end if;
  return new;
end $$;

drop trigger if exists messages_marquer_modifie on public.messages;
create trigger messages_marquer_modifie
  before update on public.messages
  for each row execute function public.marquer_message_modifie();
