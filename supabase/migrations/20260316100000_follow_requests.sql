-- ══════════════════════════════════════════════════════════════
-- VITTA UP — Follow Requests (private profile approval flow)
-- Migration: 20260316100000_follow_requests.sql
-- Depends on: 20260316000000_social_graph.sql
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- ══════════════════════════════════════
-- 1. follow_requests table
-- ══════════════════════════════════════

CREATE TABLE public.follow_requests (
  requester_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  target_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at   timestamptz DEFAULT now(),
  PRIMARY KEY (requester_id, target_id),
  CHECK (requester_id != target_id)
);

ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

-- Requester can see their outgoing requests
CREATE POLICY "Users can see own outgoing requests" ON public.follow_requests
  FOR SELECT USING (auth.uid() = requester_id);

-- Target can see their incoming requests
CREATE POLICY "Users can see incoming requests" ON public.follow_requests
  FOR SELECT USING (auth.uid() = target_id);

-- Requester can create requests
CREATE POLICY "Users can send requests" ON public.follow_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Requester can cancel their own requests
CREATE POLICY "Users can cancel requests" ON public.follow_requests
  FOR DELETE USING (auth.uid() = requester_id);

-- Target can decline requests
CREATE POLICY "Target can decline requests" ON public.follow_requests
  FOR DELETE USING (auth.uid() = target_id);

CREATE INDEX idx_follow_requests_target    ON public.follow_requests (target_id, created_at DESC);
CREATE INDEX idx_follow_requests_requester ON public.follow_requests (requester_id, created_at DESC);

-- ══════════════════════════════════════
-- 2. Replace follow_user — private profile support
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
      'Solicitacao de seguir',
      coalesce(v_follower_name, 'Alguem') || ' quer te seguir',
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
    CASE WHEN v_is_mutual THEN 'Novo amigo!' ELSE 'Novo seguidor' END,
    coalesce(v_follower_name, 'Alguem') ||
      CASE WHEN v_is_mutual THEN ' agora e seu amigo!' ELSE ' comecou a te seguir' END,
    jsonb_build_object('follower_id', p_follower_id, 'is_mutual', v_is_mutual)
  );

  RETURN json_build_object('success', true, 'is_mutual', v_is_mutual, 'requested', false);
END;
$$;

-- ══════════════════════════════════════
-- 3. accept_follow_request
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
    CASE WHEN v_is_mutual THEN 'Novo amigo!' ELSE 'Solicitacao aceita' END,
    coalesce(v_target_name, 'Alguem') ||
      CASE WHEN v_is_mutual THEN ' agora e seu amigo!' ELSE ' aceitou seu pedido para seguir' END,
    jsonb_build_object('user_id', p_target_id, 'is_mutual', v_is_mutual)
  );

  RETURN json_build_object('success', true, 'is_mutual', v_is_mutual);
END;
$$;

-- ══════════════════════════════════════
-- 4. decline_follow_request
-- ══════════════════════════════════════

CREATE OR REPLACE FUNCTION public.decline_follow_request(p_target_id uuid, p_requester_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.follow_requests
  WHERE requester_id = p_requester_id AND target_id = p_target_id;
  -- No notification sent on decline (Instagram pattern)
END;
$$;

-- ══════════════════════════════════════
-- 5. cancel_follow_request (requester cancels own request)
-- ══════════════════════════════════════

CREATE OR REPLACE FUNCTION public.cancel_follow_request(p_requester_id uuid, p_target_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.follow_requests
  WHERE requester_id = p_requester_id AND target_id = p_target_id;
END;
$$;

-- ══════════════════════════════════════
-- 6. get_follow_requests (incoming requests for a user)
-- ══════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_follow_requests(p_user_id uuid, p_limit int DEFAULT 30, p_offset int DEFAULT 0)
RETURNS TABLE(id uuid, name text, avatar_url text, bio text, followers_count integer, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.avatar_url, p.bio, p.followers_count, fr.created_at
  FROM public.follow_requests fr
  JOIN public.profiles p ON p.id = fr.requester_id
  WHERE fr.target_id = p_user_id
  ORDER BY fr.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- ══════════════════════════════════════
-- 7. Update get_relationship_status — include request status
-- ══════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_relationship_status(p_user_id uuid, p_target_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_i_follow boolean;
  v_they_follow boolean;
  v_is_blocked boolean;
  v_i_requested boolean;
  v_they_requested boolean;
BEGIN
  -- Same user shortcut
  IF p_user_id = p_target_id THEN
    RETURN json_build_object(
      'i_follow', false, 'they_follow', false, 'is_mutual', false,
      'is_blocked', false, 'i_requested', false, 'they_requested', false,
      'is_self', true
    );
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.follows WHERE follower_id = p_user_id AND following_id = p_target_id
  ) INTO v_i_follow;

  SELECT EXISTS(
    SELECT 1 FROM public.follows WHERE follower_id = p_target_id AND following_id = p_user_id
  ) INTO v_they_follow;

  SELECT EXISTS(
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = p_user_id AND blocked_id = p_target_id)
       OR (blocker_id = p_target_id AND blocked_id = p_user_id)
  ) INTO v_is_blocked;

  SELECT EXISTS(
    SELECT 1 FROM public.follow_requests WHERE requester_id = p_user_id AND target_id = p_target_id
  ) INTO v_i_requested;

  SELECT EXISTS(
    SELECT 1 FROM public.follow_requests WHERE requester_id = p_target_id AND target_id = p_user_id
  ) INTO v_they_requested;

  RETURN json_build_object(
    'i_follow', v_i_follow,
    'they_follow', v_they_follow,
    'is_mutual', v_i_follow AND v_they_follow,
    'is_blocked', v_is_blocked,
    'i_requested', v_i_requested,
    'they_requested', v_they_requested,
    'is_self', false
  );
END;
$$;

-- ══════════════════════════════════════
-- 8. Update block_user — also clean up follow requests
-- ══════════════════════════════════════

CREATE OR REPLACE FUNCTION public.block_user(p_blocker_id uuid, p_blocked_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row_count integer;
BEGIN
  -- Guard: cannot block yourself
  IF p_blocker_id = p_blocked_id THEN
    RAISE EXCEPTION 'cannot block yourself';
  END IF;

  -- Insert block (idempotent)
  INSERT INTO public.blocks (blocker_id, blocked_id)
  VALUES (p_blocker_id, p_blocked_id)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;

  -- Remove follow: blocker -> blocked
  DELETE FROM public.follows WHERE follower_id = p_blocker_id AND following_id = p_blocked_id;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  IF v_row_count > 0 THEN
    UPDATE public.profiles SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = p_blocked_id;
    UPDATE public.profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = p_blocker_id;
  END IF;

  -- Remove follow: blocked -> blocker
  DELETE FROM public.follows WHERE follower_id = p_blocked_id AND following_id = p_blocker_id;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  IF v_row_count > 0 THEN
    UPDATE public.profiles SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = p_blocker_id;
    UPDATE public.profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = p_blocked_id;
  END IF;

  -- Clean up any pending follow requests in both directions
  DELETE FROM public.follow_requests
  WHERE (requester_id = p_blocker_id AND target_id = p_blocked_id)
     OR (requester_id = p_blocked_id AND target_id = p_blocker_id);
END;
$$;

COMMIT;
