-- ══════════════════════════════════════════════════════════════
-- VITTA UP — Filtered Community Feed (blocks + private profiles)
-- Migration: 20260316200000_feed_filtering.sql
-- Depends on: 20260316000000_social_graph.sql, 20260316100000_follow_requests.sql
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- ══════════════════════════════════════
-- 1. get_filtered_feed — returns community posts excluding
--    blocked users and private profiles the viewer doesn't follow
-- ══════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_filtered_feed(
  p_viewer_id uuid,
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0,
  p_filter text DEFAULT 'all'
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  user_name text,
  avatar_url text,
  type text,
  content text,
  metadata jsonb,
  image_url text,
  energia_count integer,
  comment_count integer,
  user_has_energia boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id,
    cp.user_id,
    p.name        AS user_name,
    p.avatar_url,
    cp.type::text,
    cp.content,
    cp.metadata,
    cp.image_url,
    cp.energia_count,
    cp.comment_count,
    EXISTS(
      SELECT 1 FROM public.post_reactions pr
      WHERE pr.post_id = cp.id AND pr.user_id = p_viewer_id
    ) AS user_has_energia,
    cp.created_at
  FROM public.community_posts cp
  JOIN public.profiles p ON p.id = cp.user_id
  WHERE
    -- 1) Exclude blocked users (both directions)
    NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = p_viewer_id AND b.blocked_id = cp.user_id)
         OR (b.blocker_id = cp.user_id AND b.blocked_id = p_viewer_id)
    )
    -- 1b) Exclude muted users
    AND NOT EXISTS (
      SELECT 1 FROM public.mutes m
      WHERE m.muter_id = p_viewer_id AND m.muted_id = cp.user_id
    )
    -- 2) Exclude private profiles the viewer doesn't follow (always show own posts)
    AND (
      cp.user_id = p_viewer_id
      OR p.is_private IS NOT TRUE
      OR EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.follower_id = p_viewer_id AND f.following_id = cp.user_id
      )
    )
    -- 3) Type filter
    AND (
      p_filter = 'all'
      OR (p_filter = 'conquistas' AND cp.type IN ('lesson_complete', 'module_complete', 'streak'))
      OR (p_filter = 'desafios'   AND cp.type = 'challenge_join')
      OR (p_filter = 'fotos'      AND (cp.type = 'photo' OR cp.image_url IS NOT NULL))
    )
  ORDER BY cp.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ══════════════════════════════════════
-- 2. get_filtered_feed_before — cursor-based pagination
--    (load older posts before a given timestamp)
-- ══════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_filtered_feed_before(
  p_viewer_id uuid,
  p_before timestamptz,
  p_limit int DEFAULT 20,
  p_filter text DEFAULT 'all'
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  user_name text,
  avatar_url text,
  type text,
  content text,
  metadata jsonb,
  image_url text,
  energia_count integer,
  comment_count integer,
  user_has_energia boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id,
    cp.user_id,
    p.name        AS user_name,
    p.avatar_url,
    cp.type::text,
    cp.content,
    cp.metadata,
    cp.image_url,
    cp.energia_count,
    cp.comment_count,
    EXISTS(
      SELECT 1 FROM public.post_reactions pr
      WHERE pr.post_id = cp.id AND pr.user_id = p_viewer_id
    ) AS user_has_energia,
    cp.created_at
  FROM public.community_posts cp
  JOIN public.profiles p ON p.id = cp.user_id
  WHERE
    cp.created_at < p_before
    -- 1) Exclude blocked users (both directions)
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = p_viewer_id AND b.blocked_id = cp.user_id)
         OR (b.blocker_id = cp.user_id AND b.blocked_id = p_viewer_id)
    )
    -- 2) Exclude private profiles the viewer doesn't follow
    AND (
      cp.user_id = p_viewer_id
      OR p.is_private IS NOT TRUE
      OR EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.follower_id = p_viewer_id AND f.following_id = cp.user_id
      )
    )
    -- 3) Type filter
    AND (
      p_filter = 'all'
      OR (p_filter = 'conquistas' AND cp.type IN ('lesson_complete', 'module_complete', 'streak'))
      OR (p_filter = 'desafios'   AND cp.type = 'challenge_join')
      OR (p_filter = 'fotos'      AND (cp.type = 'photo' OR cp.image_url IS NOT NULL))
    )
  ORDER BY cp.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ══════════════════════════════════════
-- 3. get_weekly_top_members_filtered — excludes blocked users
-- ══════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_weekly_top_members_filtered(
  p_viewer_id uuid,
  p_limit int DEFAULT 5
)
RETURNS TABLE(
  user_id uuid,
  user_name text,
  avatar_url text,
  weekly_km numeric,
  weekly_energia bigint,
  post_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id         AS user_id,
    p.name       AS user_name,
    p.avatar_url,
    COALESCE(sc.weekly_km, 0)  AS weekly_km,
    COALESCE(e.weekly_energia, 0) AS weekly_energia,
    COALESCE(pc.post_count, 0)    AS post_count
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT COALESCE(s.weekly_total_km, 0) AS weekly_km
    FROM public.strava_stats_cache s
    WHERE s.user_id = p.id
    LIMIT 1
  ) sc ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS weekly_energia
    FROM public.post_reactions pr2
    JOIN public.community_posts cp2 ON cp2.id = pr2.post_id
    WHERE cp2.user_id = p.id
      AND pr2.created_at > now() - interval '7 days'
  ) e ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS post_count
    FROM public.community_posts cp3
    WHERE cp3.user_id = p.id
      AND cp3.created_at > now() - interval '7 days'
  ) pc ON true
  WHERE
    -- Exclude blocked users
    NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = p_viewer_id AND b.blocked_id = p.id)
         OR (b.blocker_id = p.id AND b.blocked_id = p_viewer_id)
    )
    -- Exclude private profiles the viewer doesn't follow (unless it's the viewer)
    AND (
      p.id = p_viewer_id
      OR p.is_private IS NOT TRUE
      OR EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.follower_id = p_viewer_id AND f.following_id = p.id
      )
    )
  ORDER BY COALESCE(e.weekly_energia, 0) DESC, COALESCE(pc.post_count, 0) DESC
  LIMIT p_limit;
END;
$$;

COMMIT;
