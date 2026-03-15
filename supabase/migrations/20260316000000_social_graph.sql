-- ══════════════════════════════════════════════════════════════
-- VITTA UP — Social Graph (follows, blocks, public profiles)
-- Migration: 20260316000000_social_graph.sql
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- ══════════════════════════════════════
-- 1. ALTER profiles — social columns
-- ══════════════════════════════════════

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS followers_count integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS following_count integer DEFAULT 0;

-- ══════════════════════════════════════
-- 2. Update profiles RLS
--    Old: only own profile readable
--    New: any authenticated user can read all profiles
-- ══════════════════════════════════════

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Authenticated can read all profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Keep existing update/insert policies (own-only) untouched.

-- ══════════════════════════════════════
-- 3. follows table
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.follows (
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT follows_no_self CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows (follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows (following_id, created_at DESC);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read follows" ON public.follows;
CREATE POLICY "Authenticated can read follows" ON public.follows
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert own follows" ON public.follows;
CREATE POLICY "Users can insert own follows" ON public.follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can delete own follows" ON public.follows;
CREATE POLICY "Users can delete own follows" ON public.follows
  FOR DELETE USING (auth.uid() = follower_id);

-- ══════════════════════════════════════
-- 4. blocks table
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT blocks_no_self CHECK (blocker_id != blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON public.blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON public.blocks (blocked_id);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own blocks" ON public.blocks;
CREATE POLICY "Users can read own blocks" ON public.blocks
  FOR SELECT USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can insert own blocks" ON public.blocks;
CREATE POLICY "Users can insert own blocks" ON public.blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can delete own blocks" ON public.blocks;
CREATE POLICY "Users can delete own blocks" ON public.blocks
  FOR DELETE USING (auth.uid() = blocker_id);

-- ══════════════════════════════════════════════════════════════
-- 5. RPCs — all SECURITY DEFINER, LANGUAGE plpgsql
-- ══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────
-- follow_user
-- ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.follow_user(p_follower_id uuid, p_following_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row_count integer;
  v_is_mutual boolean;
  v_following_name text;
  v_follower_name text;
BEGIN
  -- Guard: cannot follow yourself
  IF p_follower_id = p_following_id THEN
    RETURN json_build_object('success', false, 'error', 'cannot_follow_self');
  END IF;

  -- Guard: check blocks in both directions
  IF EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = p_follower_id AND blocked_id = p_following_id)
       OR (blocker_id = p_following_id AND blocked_id = p_follower_id)
  ) THEN
    RETURN json_build_object('success', false, 'error', 'blocked');
  END IF;

  -- Insert follow (ON CONFLICT DO NOTHING = idempotent)
  INSERT INTO public.follows (follower_id, following_id)
  VALUES (p_follower_id, p_following_id)
  ON CONFLICT (follower_id, following_id) DO NOTHING;

  -- Check if a row was actually inserted
  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  IF v_row_count = 0 THEN
    -- Already following, check mutual and return
    v_is_mutual := EXISTS (
      SELECT 1 FROM public.follows
      WHERE follower_id = p_following_id AND following_id = p_follower_id
    );
    RETURN json_build_object('success', true, 'already_following', true, 'is_mutual', v_is_mutual);
  END IF;

  -- Increment counters
  UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = p_following_id;
  UPDATE public.profiles SET following_count = following_count + 1 WHERE id = p_follower_id;

  -- Check mutual
  v_is_mutual := EXISTS (
    SELECT 1 FROM public.follows
    WHERE follower_id = p_following_id AND following_id = p_follower_id
  );

  -- Get names for notification
  SELECT name INTO v_follower_name FROM public.profiles WHERE id = p_follower_id;

  -- Create notification
  IF v_is_mutual THEN
    -- Notify both about friendship
    INSERT INTO public.notifications (user_id, sender_id, type, title, body, data)
    VALUES (
      p_following_id,
      p_follower_id,
      'friend',
      'Novo amigo!',
      coalesce(v_follower_name, 'Alguem') || ' e voce agora sao amigos',
      jsonb_build_object('follower_id', p_follower_id)
    );
  ELSE
    INSERT INTO public.notifications (user_id, sender_id, type, title, body, data)
    VALUES (
      p_following_id,
      p_follower_id,
      'follow',
      'Novo seguidor!',
      coalesce(v_follower_name, 'Alguem') || ' comecou a te seguir',
      jsonb_build_object('follower_id', p_follower_id)
    );
  END IF;

  RETURN json_build_object('success', true, 'already_following', false, 'is_mutual', v_is_mutual);
END;
$$;

-- ──────────────────────────────────────
-- unfollow_user
-- ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.unfollow_user(p_follower_id uuid, p_following_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row_count integer;
BEGIN
  DELETE FROM public.follows
  WHERE follower_id = p_follower_id AND following_id = p_following_id;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  IF v_row_count > 0 THEN
    UPDATE public.profiles SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = p_following_id;
    UPDATE public.profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = p_follower_id;
  END IF;
END;
$$;

-- ──────────────────────────────────────
-- get_relationship_status
-- ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_relationship_status(p_user_id uuid, p_target_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_i_follow boolean;
  v_they_follow boolean;
  v_is_blocked boolean;
BEGIN
  -- Same user shortcut
  IF p_user_id = p_target_id THEN
    RETURN json_build_object('i_follow', false, 'they_follow', false, 'is_mutual', false, 'is_blocked', false, 'is_self', true);
  END IF;

  v_i_follow := EXISTS (
    SELECT 1 FROM public.follows WHERE follower_id = p_user_id AND following_id = p_target_id
  );

  v_they_follow := EXISTS (
    SELECT 1 FROM public.follows WHERE follower_id = p_target_id AND following_id = p_user_id
  );

  v_is_blocked := EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = p_user_id AND blocked_id = p_target_id)
       OR (blocker_id = p_target_id AND blocked_id = p_user_id)
  );

  RETURN json_build_object(
    'i_follow', v_i_follow,
    'they_follow', v_they_follow,
    'is_mutual', v_i_follow AND v_they_follow,
    'is_blocked', v_is_blocked,
    'is_self', false
  );
END;
$$;

-- ──────────────────────────────────────
-- get_user_public_profile
-- ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_user_public_profile(p_viewer_id uuid, p_target_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile record;
  v_relationship json;
  v_blocked_by_target boolean;
BEGIN
  -- Check if target blocked the viewer
  v_blocked_by_target := EXISTS (
    SELECT 1 FROM public.blocks WHERE blocker_id = p_target_id AND blocked_id = p_viewer_id
  );

  IF v_blocked_by_target THEN
    RETURN json_build_object('error', 'not_found');
  END IF;

  -- Fetch profile
  SELECT id, name, avatar_url, bio, interests, is_private,
         points_balance, streak_days, total_lessons, total_hours,
         followers_count, following_count, created_at
  INTO v_profile
  FROM public.profiles
  WHERE id = p_target_id;

  IF v_profile IS NULL THEN
    RETURN json_build_object('error', 'not_found');
  END IF;

  -- Get relationship (skip if viewing own profile)
  IF p_viewer_id = p_target_id THEN
    v_relationship := json_build_object('i_follow', false, 'they_follow', false, 'is_mutual', false, 'is_blocked', false, 'is_self', true);
  ELSE
    v_relationship := public.get_relationship_status(p_viewer_id, p_target_id);
  END IF;

  -- If private AND viewer doesn't follow -> limited data
  IF v_profile.is_private AND p_viewer_id != p_target_id
     AND NOT EXISTS (SELECT 1 FROM public.follows WHERE follower_id = p_viewer_id AND following_id = p_target_id) THEN
    RETURN json_build_object(
      'id', v_profile.id,
      'name', v_profile.name,
      'avatar_url', v_profile.avatar_url,
      'bio', v_profile.bio,
      'followers_count', v_profile.followers_count,
      'following_count', v_profile.following_count,
      'relationship', v_relationship,
      'limited', true
    );
  END IF;

  -- Full profile
  RETURN json_build_object(
    'id', v_profile.id,
    'name', v_profile.name,
    'avatar_url', v_profile.avatar_url,
    'bio', v_profile.bio,
    'interests', v_profile.interests,
    'points_balance', v_profile.points_balance,
    'streak_days', v_profile.streak_days,
    'total_lessons', v_profile.total_lessons,
    'total_hours', v_profile.total_hours,
    'followers_count', v_profile.followers_count,
    'following_count', v_profile.following_count,
    'created_at', v_profile.created_at,
    'relationship', v_relationship,
    'limited', false
  );
END;
$$;

-- ──────────────────────────────────────
-- search_users
-- ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.search_users(p_query text, p_viewer_id uuid, p_limit int DEFAULT 20)
RETURNS TABLE (
  id uuid,
  name text,
  avatar_url text,
  bio text,
  is_private boolean,
  followers_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.avatar_url, p.bio, p.is_private, p.followers_count
  FROM public.profiles p
  WHERE p.id != p_viewer_id
    AND p.name ILIKE '%' || p_query || '%'
    -- Exclude users who blocked the viewer
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b WHERE b.blocker_id = p.id AND b.blocked_id = p_viewer_id
    )
  ORDER BY p.name
  LIMIT p_limit;
END;
$$;

-- ──────────────────────────────────────
-- block_user
-- ──────────────────────────────────────

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
END;
$$;

-- ──────────────────────────────────────
-- unblock_user
-- ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.unblock_user(p_blocker_id uuid, p_blocked_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.blocks WHERE blocker_id = p_blocker_id AND blocked_id = p_blocked_id;
END;
$$;

-- ──────────────────────────────────────
-- get_followers
-- ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_followers(
  p_user_id uuid,
  p_viewer_id uuid,
  p_limit int DEFAULT 30,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  avatar_url text,
  bio text,
  is_private boolean,
  followers_count integer,
  followed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.avatar_url, p.bio, p.is_private, p.followers_count,
         f.created_at AS followed_at
  FROM public.follows f
  JOIN public.profiles p ON p.id = f.follower_id
  WHERE f.following_id = p_user_id
    -- Exclude users who blocked the viewer
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b WHERE b.blocker_id = f.follower_id AND b.blocked_id = p_viewer_id
    )
  ORDER BY f.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ──────────────────────────────────────
-- get_following
-- ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_following(
  p_user_id uuid,
  p_viewer_id uuid,
  p_limit int DEFAULT 30,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  avatar_url text,
  bio text,
  is_private boolean,
  followers_count integer,
  followed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.avatar_url, p.bio, p.is_private, p.followers_count,
         f.created_at AS followed_at
  FROM public.follows f
  JOIN public.profiles p ON p.id = f.following_id
  WHERE f.follower_id = p_user_id
    -- Exclude users who blocked the viewer
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b WHERE b.blocker_id = f.following_id AND b.blocked_id = p_viewer_id
    )
  ORDER BY f.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ──────────────────────────────────────
-- get_friends (mutual follows)
-- ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_friends(
  p_user_id uuid,
  p_viewer_id uuid,
  p_limit int DEFAULT 30,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  avatar_url text,
  bio text,
  is_private boolean,
  followers_count integer,
  followed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.avatar_url, p.bio, p.is_private, p.followers_count,
         f1.created_at AS followed_at
  FROM public.follows f1
  -- f1: p_user_id follows them
  JOIN public.follows f2
    ON f2.follower_id = f1.following_id AND f2.following_id = p_user_id
  -- f2: they follow p_user_id back
  JOIN public.profiles p ON p.id = f1.following_id
  WHERE f1.follower_id = p_user_id
    -- Exclude users who blocked the viewer
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b WHERE b.blocker_id = f1.following_id AND b.blocked_id = p_viewer_id
    )
  ORDER BY f1.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMIT;
