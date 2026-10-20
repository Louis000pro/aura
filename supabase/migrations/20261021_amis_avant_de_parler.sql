-- ============================================================
-- Amis avant de parler
--
-- Louis, 2026-10-21 : « quand on demande quelqu'un en ami, il faut pas
-- qu'on puisse tout de suite lui parler. Il faut une acceptation pour
-- commencer à parler. »
--
-- Une demande d'ami, c'est une ligne de `followers` dans UN sens ; une
-- amitié, ce sont les DEUX sens. La base confondait les deux :
--
--   1. `sont_en_relation` acceptait un seul sens, et c'est elle que
--      `creer_conversation`, `ajouter_membres_conversation` et
--      `inviter_relais` interrogent. Envoyer une demande suffisait donc
--      pour ouvrir une discussion, ajouter quelqu'un à un groupe ou
--      l'inviter à un relais. Elle exige maintenant les deux sens, et les
--      trois fonctions suivent sans être réécrites (leur refus reste
--      `relation_requise`).
--
--   2. La règle d'envoi ne regardait que l'appartenance au fil. Dans une
--      discussion à deux, écrire demande désormais d'être amis
--      (`peut_ecrire_dans`). La règle vaut aussi après un retrait d'ami :
--      le fil reste lisible, on ne s'y écrit plus sans une nouvelle
--      demande acceptée. Les groupes ne changent pas : on y entre par un
--      ami, on n'y est pas forcément ami avec tout le monde.
--
--   3. `lancer_relais` suit la même règle dans un fil à deux : un relais
--      engage l'autre pendant une semaine et le lui annonce.
--
-- Les messages du système (`user_id` NULL) sont écrits par des fonctions
-- SECURITY DEFINER : la règle d'envoi ne les concerne pas.
--
-- Au passage : la règle d'envoi n'acceptait qu'une photo intitulée
-- « Photo ». Envoyer une affiche de séance à quelqu'un (`EnvoyerAffiche`,
-- légende « Affiche de séance ») était donc refusé par la base depuis le
-- 2026-08-30. Les deux légendes passent.
--
-- À COLLER À LA MAIN dans le SQL Editor Supabase, APRÈS
-- 20260725_messagerie_notifications_idempotentes.sql et
-- 20261007_relais_groupe.sql. Rejouable.
-- ============================================================


-- ── 1. Une relation, ce sont les deux sens ───────────────────────
-- Chaque condition rend un vrai booléen, jamais NULL : un NULL ferait
-- passer `IF NOT public.sont_en_relation(...)` sans le refus.
CREATE OR REPLACE FUNCTION public.sont_en_relation(p_a UUID, p_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_a IS NOT NULL AND p_b IS NOT NULL AND p_a <> p_b
     AND EXISTS (
       SELECT 1 FROM public.followers f
       WHERE f.follower_id = p_a AND f.following_id = p_b
     )
     AND EXISTS (
       SELECT 1 FROM public.followers f
       WHERE f.follower_id = p_b AND f.following_id = p_a
     );
$$;

REVOKE ALL ON FUNCTION public.sont_en_relation(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sont_en_relation(UUID, UUID) TO authenticated;


-- ── 2. Dans un fil à deux, on s'écrit entre amis ─────────────────
-- Elle lit le compte connecté elle-même (`auth.uid()`) au lieu de le
-- recevoir : personne ne peut s'en servir pour savoir si deux AUTRES
-- comptes sont amis. Un fil à deux dont l'autre est parti reste écrivable
-- (il n'y a plus personne à qui parler sans son accord).
CREATE OR REPLACE FUNCTION public.peut_ecrire_dans(p_conv UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND (
       NOT EXISTS (
         SELECT 1 FROM public.conversations c
         WHERE c.id = p_conv AND c.type = 'duo'
       )
       OR NOT EXISTS (
         SELECT 1 FROM public.conversation_members m
         WHERE m.conversation_id = p_conv
           AND m.user_id <> auth.uid()
           AND NOT public.sont_en_relation(auth.uid(), m.user_id)
       )
     );
$$;

REVOKE ALL ON FUNCTION public.peut_ecrire_dans(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.peut_ecrire_dans(UUID) TO authenticated;


-- ── 3. La règle d'envoi ──────────────────────────────────────────
-- Identique à celle du 2026-07-25 (notifications idempotentes), plus
-- deux choses : `peut_ecrire_dans`, et la légende d'une affiche de séance.
DROP POLICY IF EXISTS "envoi par membres" ON public.messages;
CREATE POLICY "envoi par membres"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.est_membre_conversation(conversation_id, auth.uid())
    AND public.peut_ecrire_dans(conversation_id)
    AND (
      repond_a IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.messages original
        WHERE original.id = messages.repond_a
          AND original.conversation_id = messages.conversation_id
      )
    )
    AND (
      (
        type = 'texte'
        AND media_path IS NULL
        AND LENGTH(BTRIM(contenu)) BETWEEN 1 AND 4000
      )
      OR (
        type = 'image'
        AND contenu IN ('Photo', 'Affiche de séance')
        AND media_path LIKE conversation_id::TEXT || '/' || auth.uid()::TEXT || '/%'
      )
    )
  );


-- ── 4. Un relais dans un fil à deux se lance entre amis ──────────
-- Identique à celle de 20261007_relais_groupe.sql, plus le refus
-- `pas_amis`. Un groupe n'est pas concerné (voir le point 2).
CREATE OR REPLACE FUNCTION public.lancer_relais(p_conv UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user    UUID := auth.uid();
  v_membres UUID[];
  v_run     UUID;
  v_m       UUID;
  v_bloc    RECORD;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'non_connecte');
  END IF;

  IF NOT public.est_membre_conversation(p_conv, v_user) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'pas_membre');
  END IF;

  IF NOT public.peut_ecrire_dans(p_conv) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'pas_amis');
  END IF;

  PERFORM public.fermer_relais_expires();

  SELECT ARRAY(
    SELECT user_id FROM public.conversation_members WHERE conversation_id = p_conv
  ) INTO v_membres;

  -- Un duo ou un groupe : de 2 à 5, la taille maximale d'un fil.
  IF COALESCE(array_length(v_membres, 1), 0) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'trop_peu');
  END IF;
  IF array_length(v_membres, 1) > 5 THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'trop_nombreux');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.challenge_runs
    WHERE conversation_id = p_conv AND statut IN ('inscription','en_cours')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'relais_deja_ici');
  END IF;

  SELECT m.user_id AS qui, r.conversation_id AS ou, p.pseudo AS pseudo
    INTO v_bloc
    FROM public.challenge_run_members m
    JOIN public.challenge_runs r ON r.id = m.run_id
    LEFT JOIN public.profiles p ON p.id = m.user_id
   WHERE m.user_id = ANY(v_membres)
     AND r.statut IN ('inscription','en_cours')
   LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'raison', CASE WHEN v_bloc.qui = v_user THEN 'mon_relais_ailleurs'
                     ELSE 'son_relais_ailleurs' END,
      'qui', v_bloc.pseudo,
      'conversation_id', v_bloc.ou
    );
  END IF;

  INSERT INTO public.challenge_runs (created_by, conversation_id, statut, serie, starts_on, max_membres)
  VALUES (v_user, p_conv, 'en_cours', public.serie_a_jouer(v_membres), CURRENT_DATE,
          array_length(v_membres, 1))
  RETURNING id INTO v_run;

  UPDATE public.challenge_runs
     SET ends_on = starts_on + (window_days - 1)
   WHERE id = v_run;

  FOREACH v_m IN ARRAY v_membres LOOP
    INSERT INTO public.challenge_run_members (run_id, user_id)
    VALUES (v_run, v_m) ON CONFLICT DO NOTHING;
  END LOOP;

  INSERT INTO public.messages (conversation_id, user_id, contenu, type)
  SELECT p_conv, NULL,
         'Le relais est lancé. Vous grimpez les 4 maillons ensemble : on avance quand '
         || CASE WHEN array_length(v_membres, 1) = 2 THEN 'les deux ont' ELSE 'tout le monde a' END
         || ' fait le maillon. Vous jouez pour '
         || initcap(r.serie) || '.',
         'systeme'
    FROM public.challenge_runs r WHERE r.id = v_run;

  RETURN jsonb_build_object('ok', true, 'run_id', v_run, 'conversation_id', p_conv);
END;
$fn$;

REVOKE ALL ON FUNCTION public.lancer_relais(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lancer_relais(UUID) TO authenticated;
