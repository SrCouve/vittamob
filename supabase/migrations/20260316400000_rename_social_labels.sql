-- ══════════════════════════════════════════════════════════════
-- VITTA UP — Rename social labels: Seguir → Apoiar
-- Migration: 20260316400000_rename_social_labels.sql
-- Updates notification texts in follow_user and accept_follow_request RPCs
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- ══════════════════════════════════════
-- 1. Replace follow_user — updated notification texts
-- ══════════════════════════════════════

CREATE OR REPLACE FUNCTION public.follow_user(p_follower_id uuid, p_following_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_blocked boolean;
  v_follower_name text;
  v_is_mutual boolean;
  v_target_private boolean;
  v_row_count integer;
BEGIN
  -- Guard: cannot follow yourself
  IF p_follower_id = p_following_id THEN
    RETURN json_build_object('success', false, 'error', 'cannot_follow_self');
  END IF;

  -- Guard: check blocks in both directions
  SELECT EXISTS(
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = p_following_id AND blocked_id = p_follower_id)
       OR (blocker_id = p_follower_id AND blocked_id = p_following_id)
  ) INTO v_is_blocked;

  IF v_is_blocked THEN
    RETURN json_build_object('success', false, 'error', 'blocked');
  END IF;

  -- Check if target profile is private
  SELECT is_private INTO v_target_private FROM public.profiles WHERE id = p_following_id;

  IF v_target_private = true THEN
    -- Already following (was approved before)
    IF EXISTS(SELECT 1 FROM public.follows WHERE follower_id = p_follower_id AND following_id = p_following_id) THEN
      RETURN json_build_object('success', true, 'error', 'already_following');
    END IF;

    -- Already requested
    IF EXISTS(SELECT 1 FROM public.follow_requests WHERE requester_id = p_follower_id AND target_id = p_following_id) THEN
      RETURN json_build_object('success', true, 'requested', true, 'already_requested', true);
    END IF;

    -- Insert follow request
    INSERT INTO public.follow_requests (requester_id, target_id)
    VALUES (p_follower_id, p_following_id);

    -- Notify target
    SELECT name INTO v_follower_name FROM public.profiles WHERE id = p_follower_id;
    INSERT INTO public.notifications (user_id, sender_id, type, title, body, data)
    VALUES (
      p_following_id, p_follower_id, 'follow_request',
      'Solicitacao de apoio',
      coalesce(v_follower_name, 'Alguem') || ' quer te apoiar',
      jsonb_build_object('requester_id', p_follower_id)
    );

    RETURN json_build_object('success', true, 'requested', true);
  END IF;

  -- ── Public profile: direct follow (existing logic) ──

  INSERT INTO public.follows (follower_id, following_id)
  VALUES (p_follower_id, p_following_id)
  ON CONFLICT (follower_id, following_id) DO NOTHING;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  IF v_row_count = 0 THEN
    v_is_mutual := EXISTS (
      SELECT 1 FROM public.follows
      WHERE follower_id = p_following_id AND following_id = p_follower_id
    );
    RETURN json_build_object('success', true, 'already_following', true, 'is_mutual', v_is_mutual, 'requested', false);
  END IF;

  -- Increment counters
  UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = p_following_id;
  UPDATE public.profiles SET following_count = following_count + 1 WHERE id = p_follower_id;

  -- Check mutual
  SELECT EXISTS(
    SELECT 1 FROM public.follows WHERE follower_id = p_following_id AND following_id = p_follower_id
  ) INTO v_is_mutual;

  -- Notification
  SELECT name INTO v_follower_name FROM public.profiles WHERE id = p_follower_id;
  INSERT INTO public.notifications (user_id, sender_id, type, title, body, data)
  VALUES (
    p_following_id,
    p_follower_id,
    CASE WHEN v_is_mutual THEN 'friend' ELSE 'follow' END,
    CASE WHEN v_is_mutual THEN 'Novo parceiro!' ELSE 'Novo apoiador' END,
    coalesce(v_follower_name, 'Alguem') ||
      CASE WHEN v_is_mutual THEN ' agora e seu parceiro!' ELSE ' te apoiou' END,
    jsonb_build_object('follower_id', p_follower_id, 'is_mutual', v_is_mutual)
  );

  RETURN json_build_object('success', true, 'is_mutual', v_is_mutual, 'requested', false);
END;
$$;

-- ══════════════════════════════════════
-- 2. Replace accept_follow_request — updated notification texts
-- ══════════════════════════════════════

CREATE OR REPLACE FUNCTION public.accept_follow_request(p_target_id uuid, p_requester_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_mutual boolean;
  v_target_name text;
BEGIN
  -- Verify request exists
  IF NOT EXISTS(SELECT 1 FROM public.follow_requests WHERE requester_id = p_requester_id AND target_id = p_target_id) THEN
    RETURN json_build_object('error', 'request_not_found');
  END IF;

  -- Delete the request
  DELETE FROM public.follow_requests WHERE requester_id = p_requester_id AND target_id = p_target_id;

  -- Create the follow
  INSERT INTO public.follows (follower_id, following_id)
  VALUES (p_requester_id, p_target_id)
  ON CONFLICT DO NOTHING;

  -- Update counters
  UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = p_target_id;
  UPDATE public.profiles SET following_count = following_count + 1 WHERE id = p_requester_id;

  -- Check mutual
  SELECT EXISTS(
    SELECT 1 FROM public.follows WHERE follower_id = p_target_id AND following_id = p_requester_id
  ) INTO v_is_mutual;

  -- Notify requester that they were accepted
  SELECT name INTO v_target_name FROM public.profiles WHERE id = p_target_id;
  INSERT INTO public.notifications (user_id, sender_id, type, title, body, data)
  VALUES (
    p_requester_id, p_target_id,
    CASE WHEN v_is_mutual THEN 'friend' ELSE 'follow_accepted' END,
    CASE WHEN v_is_mutual THEN 'Novo parceiro!' ELSE 'Apoio aceito' END,
    coalesce(v_target_name, 'Alguem') ||
      CASE WHEN v_is_mutual THEN ' agora e seu parceiro!' ELSE ' aceitou seu apoio' END,
    jsonb_build_object('user_id', p_target_id, 'is_mutual', v_is_mutual)
  );

  RETURN json_build_object('success', true, 'is_mutual', v_is_mutual);
END;
$$;

COMMIT;
