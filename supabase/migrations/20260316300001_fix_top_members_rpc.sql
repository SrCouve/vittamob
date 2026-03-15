-- Fix get_weekly_top_members_filtered: was referencing non-existent columns
-- (data->>'distance' and cached_at). Uses same logic as original get_weekly_top_members.

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
DECLARE
  week_start TIMESTAMPTZ;
BEGIN
  week_start := date_trunc('week', now());
  RETURN QUERY
  WITH weekly_posts AS (
    SELECT cp.user_id, COUNT(*) AS cnt
    FROM community_posts cp
    WHERE cp.created_at >= week_start
    GROUP BY cp.user_id
  ), weekly_reactions AS (
    SELECT pr.user_id, COUNT(*) AS cnt
    FROM post_reactions pr
    WHERE pr.created_at >= week_start
    GROUP BY pr.user_id
  ), weekly_strava AS (
    SELECT sc.user_id, COALESCE(sc.weekly_total_km, 0) AS km
    FROM strava_stats_cache sc
  )
  SELECT p.id, p.name, p.avatar_url,
    COALESCE(ws.km, 0), COALESCE(wr.cnt, 0), COALESCE(wp.cnt, 0)
  FROM profiles p
  LEFT JOIN weekly_posts wp ON wp.user_id = p.id
  LEFT JOIN weekly_reactions wr ON wr.user_id = p.id
  LEFT JOIN weekly_strava ws ON ws.user_id = p.id
  WHERE
    (COALESCE(wp.cnt, 0) + COALESCE(wr.cnt, 0) > 0)
    -- Exclude blocked users
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = p_viewer_id AND b.blocked_id = p.id)
         OR (b.blocker_id = p.id AND b.blocked_id = p_viewer_id)
    )
    -- Exclude private profiles the viewer doesn't follow
    AND (
      p.id = p_viewer_id
      OR p.is_private IS NOT TRUE
      OR EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.follower_id = p_viewer_id AND f.following_id = p.id
      )
    )
  ORDER BY (COALESCE(wp.cnt, 0) * 3 + COALESCE(wr.cnt, 0) + COALESCE(ws.km, 0) * 0.5) DESC
  LIMIT p_limit;
END; $$;
